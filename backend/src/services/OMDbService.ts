// OMDb API Service with rate limiting, caching, and error handling
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { RateLimiter } from 'limiter';
import NodeCache from 'node-cache';
import { OMDbMovieResponse, OMDbSearchResponse, Movie } from '../models/Movie';
import { Logger } from '../utils/Logger';
import { ApiUsageLogger } from '../utils/ApiUsageLogger';

export class OMDbService {
  private apiKey: string;
  private baseUrl: string = 'http://www.omdbapi.com/';
  private httpClient: AxiosInstance;
  private rateLimiter: RateLimiter;
  private cache: NodeCache;
  private logger: Logger;
  private apiUsageLogger: ApiUsageLogger;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OMDb API key is required');
    }

    this.apiKey = apiKey;
    this.logger = new Logger('OMDbService');
    this.apiUsageLogger = new ApiUsageLogger();

    // Initialize HTTP client with timeout and retry logic
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000, // 10 seconds
      headers: {
        'User-Agent': 'MovieAggregator/1.0',
      },
    });

    // Rate limiter: OMDb allows 1000 requests per day for free tier
    // Conservative approach: 1 request per second (86400 per day max)
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 1,
      interval: 'second',
    });

    // Cache with 1 hour TTL for movie data, 24 hours for search results
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 hour default
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging and rate limiting
    this.httpClient.interceptors.request.use(
      async (config) => {
        // Wait for rate limiter
        await this.rateLimiter.removeTokens(1);
        
        this.logger.info(`Making request to: ${config.url}`, {
          params: config.params,
        });

        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.httpClient.interceptors.response.use(
      (response: AxiosResponse) => {
        this.apiUsageLogger.logRequest({
          apiSource: 'omdb',
          endpoint: response.config.url || '',
          responseStatus: response.status,
          responseTimeMs: 0, // TODO: Implement proper response time tracking
        });

        return response;
      },
      (error) => {
        const responseStatus = error.response?.status || 0;
        const errorMessage = error.response?.data?.Error || error.message;

        this.apiUsageLogger.logRequest({
          apiSource: 'omdb',
          endpoint: error.config?.url || '',
          responseStatus,
          errorMessage,
          responseTimeMs: Date.now() - (error.config?.metadata?.startTime || Date.now()),
        });

        this.logger.error('API request failed:', {
          url: error.config?.url,
          status: responseStatus,
          error: errorMessage,
        });

        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private handleApiError(error: any): Error {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.Error || error.message;

      switch (status) {
        case 401:
          return new Error('Invalid API key or unauthorized access');
        case 429:
          return new Error('Rate limit exceeded. Please try again later');
        case 404:
          return new Error('Movie not found');
        case 500:
          return new Error('OMDb API server error');
        default:
          return new Error(`API error: ${message}`);
      }
    } else if (error.request) {
      return new Error('Network error: Unable to reach OMDb API');
    } else {
      return new Error(`Request error: ${error.message}`);
    }
  }

  private getCacheKey(type: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    return `omdb:${type}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Get movie by IMDb ID
   */
  async getMovieById(imdbId: string, plot: 'short' | 'full' = 'full'): Promise<Movie | null> {
    const cacheKey = this.getCacheKey('movie', { imdbId, plot });
    
    // Check cache first
    const cached = this.cache.get<Movie>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for movie: ${imdbId}`);
      return cached;
    }

    try {
      const response = await this.httpClient.get<OMDbMovieResponse>('', {
        params: {
          apikey: this.apiKey,
          i: imdbId,
          plot,
          r: 'json',
        },
      });

      const data: OMDbMovieResponse = response.data;

      if (data.Response === 'False') {
        this.logger.warn(`Movie not found: ${imdbId}`, { error: data.Error });
        return null;
      }

      const movie = this.transformOMDbToMovie(data);
      
      // Cache the result
      this.cache.set(cacheKey, movie);
      
      this.logger.info(`Successfully fetched movie: ${movie.title} (${movie.imdbId})`);
      return movie;

    } catch (error) {
      this.logger.error(`Failed to fetch movie ${imdbId}:`, error);
      throw error;
    }
  }

  /**
   * Get movie by title and year
   */
  async getMovieByTitle(title: string, year?: number, plot: 'short' | 'full' = 'full'): Promise<Movie | null> {
    const cacheKey = this.getCacheKey('movie_title', { title, year, plot });
    
    // Check cache first
    const cached = this.cache.get<Movie>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for movie title: ${title}`);
      return cached;
    }

    try {
      const params: any = {
        apikey: this.apiKey,
        t: title,
        plot,
        r: 'json',
      };

      if (year) {
        params.y = year;
      }

      const response = await this.httpClient.get<OMDbMovieResponse>('', {
        params,
      });

      const data: OMDbMovieResponse = response.data;

      if (data.Response === 'False') {
        this.logger.warn(`Movie not found: ${title}`, { error: data.Error });
        return null;
      }

      const movie = this.transformOMDbToMovie(data);
      
      // Cache the result
      this.cache.set(cacheKey, movie);
      
      this.logger.info(`Successfully fetched movie: ${movie.title} (${movie.imdbId})`);
      return movie;

    } catch (error) {
      this.logger.error(`Failed to fetch movie ${title}:`, error);
      throw error;
    }
  }

  /**
   * Search movies by title
   */
  async searchMovies(query: string, year?: number, page: number = 1): Promise<{
    movies: Partial<Movie>[];
    totalResults: number;
    totalPages: number;
  }> {
    const cacheKey = this.getCacheKey('search', { query, year, page });
    
    // Check cache first (longer TTL for search results)
    const cached = this.cache.get<any>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for search: ${query}`);
      return cached;
    }

    try {
      const params: any = {
        apikey: this.apiKey,
        s: query,
        page,
        r: 'json',
      };

      if (year) {
        params.y = year;
      }

      const response = await this.httpClient.get<OMDbSearchResponse>('', {
        params,
      });

      const data: OMDbSearchResponse = response.data;

      if (data.Response === 'False') {
        this.logger.warn(`Search failed: ${query}`, { error: data.Error });
        return {
          movies: [],
          totalResults: 0,
          totalPages: 0,
        };
      }

      const totalResults = parseInt(data.totalResults);
      const totalPages = Math.ceil(totalResults / 10); // OMDb returns 10 results per page

      const movies = data.Search.map((item: { Title: string; Year: string; imdbID: string; Type: string; Poster: string }) => ({
        imdbId: item.imdbID,
        title: item.Title,
        releaseYear: parseInt(item.Year),
        ...(item.Poster !== 'N/A' && { posterUrl: item.Poster }),
        apiSource: 'omdb',
      }));

      const result = {
        movies,
        totalResults,
        totalPages,
      };

      // Cache search results for 24 hours
      this.cache.set(cacheKey, result, 86400);
      
      this.logger.info(`Search completed: ${query} - ${totalResults} results`);
      return result;

    } catch (error) {
      this.logger.error(`Search failed for ${query}:`, error);
      throw error;
    }
  }

  /**
   * Get trending movies (OMDb doesn't have trending, so we'll use popular searches)
   */
  async getTrendingMovies(): Promise<Partial<Movie>[]> {
    const cacheKey = 'omdb:trending';
    
    // Check cache first
    const cached = this.cache.get<Partial<Movie>[]>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for trending movies');
      return cached;
    }

    // Since OMDb doesn't have trending, we'll search for popular movies
    const popularQueries = [
      'Marvel', 'Star Wars', 'Batman', 'Spider-Man', 'Avengers',
      'Fast', 'Mission Impossible', 'John Wick', 'Transformers', 'Jurassic'
    ];

    try {
      const trendingMovies: Partial<Movie>[] = [];
      
      for (const query of popularQueries.slice(0, 3)) { // Limit to avoid rate limits
        const searchResult = await this.searchMovies(query, undefined, 1);
        trendingMovies.push(...searchResult.movies.slice(0, 2)); // Take top 2 from each search
      }

      // Remove duplicates based on IMDb ID
      const uniqueMovies = trendingMovies.filter((movie, index, self) =>
        index === self.findIndex(m => m.imdbId === movie.imdbId)
      );

      // Cache for 6 hours
      this.cache.set(cacheKey, uniqueMovies, 21600);
      
      this.logger.info(`Fetched ${uniqueMovies.length} trending movies`);
      return uniqueMovies;

    } catch (error) {
      this.logger.error('Failed to fetch trending movies:', error);
      throw error;
    }
  }

  /**
   * Transform OMDb response to our Movie interface
   */
  private transformOMDbToMovie(data: OMDbMovieResponse): Movie {
    const imdbRating = data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : undefined;
    const metascore = data.Metascore !== 'N/A' ? parseInt(data.Metascore) : undefined;
    
    // Extract Rotten Tomatoes rating
    let rottenTomatoesRating: number | undefined;
    const rtRating = data.Ratings?.find(r => r.Source === 'Rotten Tomatoes');
    if (rtRating) {
      const match = rtRating.Value.match(/(\d+)%/);
      if (match && match[1]) {
        rottenTomatoesRating = parseInt(match[1]);
      }
    }

    // Parse runtime
    let runtimeMinutes: number | undefined;
    if (data.Runtime !== 'N/A') {
      const match = data.Runtime.match(/(\d+)/);
      if (match && match[1]) {
        runtimeMinutes = parseInt(match[1]);
      }
    }

    // Parse box office
    let boxOfficeGross: number | undefined;
    if (data.BoxOffice !== 'N/A') {
      const match = data.BoxOffice.replace(/[$,]/g, '').match(/(\d+)/);
      if (match && match[1]) {
        boxOfficeGross = parseInt(match[1]);
      }
    }

    const movie: Movie = {
      id: '', // Will be set by database
      imdbId: data.imdbID,
      title: data.Title,
      originalTitle: data.Title,
      ...(data.Year !== 'N/A' && { releaseYear: parseInt(data.Year) }),
      ...(data.Released !== 'N/A' && { releaseDate: new Date(data.Released) }),
      ...(runtimeMinutes !== undefined && { runtimeMinutes }),
      ...(data.Plot !== 'N/A' && { plotSummary: data.Plot }),
      ...(data.Plot !== 'N/A' && { plotShort: data.Plot }),
      ...(imdbRating !== undefined && { ratingImdb: imdbRating }),
      ...(rottenTomatoesRating !== undefined && { ratingRottenTomatoes: rottenTomatoesRating }),
      ...(metascore !== undefined && { ratingMetacritic: metascore }),
      ...(boxOfficeGross !== undefined && { boxOfficeGross }),
      ...(data.Language !== 'N/A' && { language: data.Language }),
      ...(data.Country !== 'N/A' && { country: data.Country }),
      ...(data.Director !== 'N/A' && { director: data.Director }),
      ...(data.Writer !== 'N/A' && { writer: data.Writer }),
      ...(data.Awards !== 'N/A' && { awards: data.Awards }),
      ...(data.Poster !== 'N/A' && { posterUrl: data.Poster }),
      apiSource: 'omdb',
      lastUpdated: new Date(),
      createdAt: new Date(),
    };

    return movie;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.flushAll();
    this.logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    keys: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const stats = this.cache.getStats();
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      
      // Test with a known movie
      await this.getMovieById('tt0111161'); // The Shawshank Redemption
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}