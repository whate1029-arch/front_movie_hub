import axios from 'axios';
import { Movie, MovieDetails, Credits, SearchResponse, OMDbMovie, StreamingLink } from '@/types/movie';
import { logger } from './logger';
import { apiCache } from './cache';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OMDB_BASE_URL = 'https://www.omdbapi.com';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY,
  },
});

const omdbApi = axios.create({
  baseURL: OMDB_BASE_URL,
  params: {
    apikey: process.env.OMDB_API_KEY || process.env.NEXT_PUBLIC_OMDB_API_KEY,
  },
});

const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { status_message?: string } | string | undefined;
    const responseMessage =
      typeof responseData === 'string'
        ? responseData
        : responseData?.status_message;

    const status = error.response?.status;
    const statusText = status ? ` (status ${status})` : '';

    return (responseMessage || error.message) + statusText;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
};

const createSeededRandom = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

export class MovieAPI {
  // TMDB API Methods
  static async searchMovies(
    query: string,
    page: number = 1,
    options?: { signal?: AbortSignal }
  ): Promise<SearchResponse> {
    const sanitizedQuery = query.trim();
    const safePage = Math.max(1, page);

    if (!sanitizedQuery) {
      return {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
      };
    }

    try {
      const response = await tmdbApi.get('/search/movie', {
        params: { query: sanitizedQuery, page: safePage },
        signal: options?.signal,
      });
      return response.data;
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error(`Error searching movies: ${message}`, error);
      throw new Error('Failed to search movies');
    }
  }

  static async getMovieDetails(id: number): Promise<MovieDetails> {
    const cacheKey = `movie_details_${id}`;
    const cached = apiCache.get<MovieDetails>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await tmdbApi.get(`/movie/${id}`);
      const data = response.data;
      apiCache.set(cacheKey, data, 600000); // Cache for 10 minutes
      return data;
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error(`Error fetching movie details: ${message}`, error);
      throw new Error('Failed to fetch movie details');
    }
  }

  static async getMovieCredits(id: number): Promise<Credits> {
    const cacheKey = `movie_credits_${id}`;
    const cached = apiCache.get<Credits>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await tmdbApi.get(`/movie/${id}/credits`);
      const data = response.data;
      apiCache.set(cacheKey, data, 600000); // Cache for 10 minutes
      return data;
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error(`Error fetching movie credits: ${message}`, error);
      throw new Error('Failed to fetch movie credits');
    }
  }

  static async getTrendingMovies(timeWindow: 'day' | 'week' = 'week'): Promise<Movie[]> {
    const cacheKey = `trending_${timeWindow}`;
    const cached = apiCache.get<Movie[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await tmdbApi.get(`/trending/movie/${timeWindow}`);
      const movies = response.data.results;
      apiCache.set(cacheKey, movies);
      return movies;
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error(`Error fetching trending movies: ${message}`, error);
      throw new Error('Failed to fetch trending movies');
    }
  }

  static async getPopularMovies(page: number = 1): Promise<SearchResponse> {
    const cacheKey = `popular_${page}`;
    const cached = apiCache.get<SearchResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await tmdbApi.get('/movie/popular', {
        params: { page },
      });
      const data = response.data;
      apiCache.set(cacheKey, data);
      return data;
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error(`Error fetching popular movies: ${message}`, error);
      throw new Error('Failed to fetch popular movies');
    }
  }

  static async getTopRatedMovies(page: number = 1): Promise<SearchResponse> {
    const cacheKey = `toprated_${page}`;
    const cached = apiCache.get<SearchResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await tmdbApi.get('/movie/top_rated', {
        params: { page },
      });
      const data = response.data;
      apiCache.set(cacheKey, data);
      return data;
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error(`Error fetching top rated movies: ${message}`, error);
      throw new Error('Failed to fetch top rated movies');
    }
  }

  static async getNowPlayingMovies(page: number = 1): Promise<SearchResponse> {
    const cacheKey = `nowplaying_${page}`;
    const cached = apiCache.get<SearchResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await tmdbApi.get('/movie/now_playing', {
        params: { page },
      });
      const data = response.data;
      apiCache.set(cacheKey, data);
      return data;
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error(`Error fetching now playing movies: ${message}`, error);
      throw new Error('Failed to fetch now playing movies');
    }
  }

  // OMDb API Methods
  static async getOMDbDetails(imdbId: string): Promise<OMDbMovie | null> {
    const cacheKey = `omdb_${imdbId}`;
    const cached = apiCache.get<OMDbMovie | null>(cacheKey);

    if (cached !== null && cached !== undefined) {
      return cached;
    }

    try {
      const response = await omdbApi.get('', {
        params: { i: imdbId },
      });

      if (response.data.Response === 'False') {
        apiCache.set(cacheKey, null, 600000);
        return null;
      }

      const data = response.data;
      apiCache.set(cacheKey, data, 600000); // Cache for 10 minutes
      return data;
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error(`Error fetching OMDb details: ${message}`, error);
      return null;
    }
  }

  static async searchOMDb(title: string, year?: string): Promise<OMDbMovie | null> {
    try {
      const params: { t: string; y?: string } = { t: title };
      if (year) params.y = year;

      const response = await omdbApi.get('', { params });

      if (response.data.Response === 'False') {
        return null;
      }

      return response.data;
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error(`Error searching OMDb: ${message}`, error);
      return null;
    }
  }

  // Utility Methods
  static getImageUrl(
    path?: string | null,
    size: 'w200' | 'w300' | 'w400' | 'w500' | 'w780' | 'original' = 'w500'
  ): string {
    if (!path) return '/placeholder-movie.jpg';
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  }

  static getBackdropUrl(
    path?: string | null,
    size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280'
  ): string {
    if (!path) return '/placeholder-backdrop.jpg';
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  }

  // Mock streaming links (replace with real affiliate/streaming service APIs)
  static getStreamingLinks(movie: MovieDetails): StreamingLink[] {
    type MockPlatform = {
      name: string;
      type: StreamingLink['type'];
      price?: string;
    };

    const platforms: MockPlatform[] = [
      { name: 'Netflix', type: 'subscription' },
      { name: 'Amazon Prime', type: 'subscription' },
      { name: 'Hulu', type: 'subscription' },
      { name: 'Disney+', type: 'subscription' },
      { name: 'YouTube Movies', type: 'rent', price: '$3.99' },
      { name: 'Google Play', type: 'rent', price: '$3.99' },
      { name: 'Apple TV', type: 'rent', price: '$3.99' },
    ];

    const seededRandom = createSeededRandom(movie.id);

    const shuffledPlatforms = platforms
      .map(platform => ({ platform, sortKey: seededRandom() }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(entry => entry.platform);

    const minOptions = 2;
    const maxOptions = 5;
    const maxAvailable = Math.min(shuffledPlatforms.length, maxOptions);
    const minAvailable = Math.min(minOptions, maxAvailable);
    const range = maxAvailable - minAvailable + 1;
    const selectionCount = minAvailable + Math.floor(seededRandom() * range);

    return shuffledPlatforms.slice(0, selectionCount).map(platform => {
      const link: StreamingLink = {
        platform: platform.name,
        url: `https://example.com/watch/${movie.id}?platform=${encodeURIComponent(
          platform.name.toLowerCase().replace(/\s+/g, '')
        )}`,
        type: platform.type,
      };

      if (platform.price) {
        link.price = platform.price;
      }

      return link;
    });
  }

  // Combined method to get comprehensive movie data
  static async getComprehensiveMovieData(tmdbId: number) {
    try {
      const [movieDetails, credits] = await Promise.all([
        this.getMovieDetails(tmdbId),
        this.getMovieCredits(tmdbId),
      ]);

      let omdbData = null;
      if (movieDetails.imdb_id) {
        omdbData = await this.getOMDbDetails(movieDetails.imdb_id);
      }

      const streamingLinks = this.getStreamingLinks(movieDetails);

      return {
        tmdb: movieDetails,
        credits,
        omdb: omdbData,
        streamingLinks,
      };
    } catch (error) {
      const message = extractErrorMessage(error);
      logger.error(`Error fetching comprehensive movie data: ${message}`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch comprehensive movie data');
    }
  }
}
