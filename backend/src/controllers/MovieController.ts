import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { OMDbService } from '../services/OMDbService';
import { LLMService } from '../services/LLMService';
import { DatabaseService } from '../services/DatabaseService';
import { CopyrightService } from '../services/CopyrightService';
import { CacheService } from '../services/CacheService';
import { Logger } from '../utils/Logger';
import { Movie, LLMMovieCard } from '../models/Movie';

export class MovieController {
  private omdbService: OMDbService;
  private llmService: LLMService;
  private databaseService: DatabaseService;
  private copyrightService: CopyrightService;
  private cacheService: CacheService;
  private logger: Logger;

  constructor(
    omdbService: OMDbService,
    llmService: LLMService,
    databaseService: DatabaseService,
    copyrightService: CopyrightService,
    cacheService: CacheService
  ) {
    this.omdbService = omdbService;
    this.llmService = llmService;
    this.databaseService = databaseService;
    this.copyrightService = copyrightService;
    this.cacheService = cacheService;
    this.logger = new Logger();
  }

  /**
   * GET /api/movies/trending
   * Get trending movies
   */
  async getTrendingMovies(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const includeCards = req.query.includeCards === 'true';

      this.logger.info('Fetching trending movies', { limit, includeCards });

      // Check cache first
      const cacheKey = `trending:${limit}:${includeCards}`;
      const cachedResult = await this.cacheService.get(cacheKey);
      
      if (cachedResult) {
        this.logger.info('Returning cached trending movies', { cacheKey });
        res.json({
          success: true,
          data: cachedResult,
          cached: true
        });
        return;
      }

      // Get trending movies from database
      let trendingMovies = await this.databaseService.getTrendingMovies(limit);

      // If no trending movies in database, fetch from API
      if (trendingMovies.length === 0) {
        this.logger.info('No trending movies in database, fetching from API');
        const apiMovies = await this.omdbService.getTrendingMovies();
        
        // Save to database - fetch full details first
        for (const partialMovie of apiMovies.slice(0, limit)) {
          if (partialMovie.imdbId) {
            try {
              // Check if movie already exists
              const existingMovie = await this.databaseService.getMovieById(partialMovie.imdbId);
              if (!existingMovie) {
                // Fetch full movie details from OMDb
                const fullMovie = await this.omdbService.getMovieById(partialMovie.imdbId);
                if (fullMovie) {
                  await this.databaseService.saveMovie(fullMovie);
                }
              }
            } catch (error) {
              this.logger.warn('Failed to save trending movie', { 
                imdbId: partialMovie.imdbId,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        }
        
        // Update trending movies table
        const trendingData = apiMovies.slice(0, limit)
          .filter(movie => movie.imdbId) // Only include movies with valid imdbId
          .map((movie, index) => ({
            id: `trending_${movie.imdbId}_${Date.now()}`,
            movieId: movie.imdbId!,
            trendDate: new Date(),
            trendRank: index + 1,
            trendScore: 100 - index, // Simple scoring system
            trendSource: 'omdb_api',
            createdAt: new Date()
          }));
        
        await this.databaseService.saveTrendingMovies(trendingData);
        
        // Fetch full movie details for the trending movies
        const fullMovies: Movie[] = [];
        for (const partialMovie of apiMovies.slice(0, limit)) {
          if (partialMovie.imdbId) {
            try {
              const fullMovie = await this.databaseService.getMovieById(partialMovie.imdbId);
              if (fullMovie) {
                fullMovies.push(fullMovie);
              }
            } catch (error) {
              this.logger.warn('Failed to fetch full movie details', { 
                imdbId: partialMovie.imdbId,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        }
        trendingMovies = fullMovies;
      }

      let result: any = { movies: trendingMovies };

      // Include LLM-generated cards if requested
      if (includeCards) {
        const movieCards: { [key: string]: LLMMovieCard } = {};
        
        for (const movie of trendingMovies) {
          try {
            let card = await this.databaseService.getLLMMovieCard(movie.imdbId);
            
            if (!card) {
              // Generate new card
              card = await this.llmService.generateMovieCard(movie);
              await this.databaseService.saveLLMMovieCard(card);
            }
            
            movieCards[movie.imdbId] = card;
          } catch (error) {
            this.logger.error('Failed to get/generate movie card', {
              movieId: movie.imdbId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        
        result.movieCards = movieCards;
      }

      // Cache the result for 15 minutes
      await this.cacheService.set(cacheKey, result, { ttl: 15 * 60 });

      res.json({
        success: true,
        data: result,
        meta: {
          count: trendingMovies.length,
          limit,
          includeCards
        }
      });

    } catch (error) {
      this.logger.error('Failed to get trending movies', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trending movies',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/movies/search
   * Search movies
   */
  async searchMovies(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const genre = req.query.genre as string;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const minRating = req.query.minRating ? parseFloat(req.query.minRating as string) : undefined;
      const maxRating = req.query.maxRating ? parseFloat(req.query.maxRating as string) : undefined;

      this.logger.info('Searching movies', { query, page, limit, genre, year });

      // Check cache first
      const cacheKey = `search:${query}:${page}:${limit}:${genre || ''}:${year || ''}:${minRating || ''}:${maxRating || ''}`;
      const cachedResult = await this.cacheService.get(cacheKey);
      
      if (cachedResult) {
        this.logger.info('Returning cached search results', { cacheKey });
        res.json({
          success: true,
          data: cachedResult,
          cached: true
        });
        return;
      }

      // Search in database first
      const searchOptions: any = { page, limit };
      if (genre) searchOptions.genre = genre;
      if (year !== undefined) searchOptions.year = year;
      if (minRating !== undefined) searchOptions.minRating = minRating;
      if (maxRating !== undefined) searchOptions.maxRating = maxRating;
      
      const dbResults = await this.databaseService.searchMovies(query, searchOptions);

      let movies: Partial<Movie>[] = dbResults.movies;
      let total = dbResults.total;

      // If no results in database, search via API
      if (movies.length === 0) {
        this.logger.info('No results in database, searching via API');
        const apiResults = await this.omdbService.searchMovies(query, page);
        
        if (apiResults.movies.length > 0) {
          // Save movies to database
          for (const movie of apiResults.movies) {
            try {
              // Only save if movie has required fields
              if (movie.id && movie.imdbId && movie.title) {
                await this.databaseService.saveMovie(movie as Movie);
              }
            } catch (error) {
              this.logger.error('Failed to save movie from API search', {
                movieId: movie.imdbId,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          
          movies = apiResults.movies;
          total = apiResults.totalResults;
        }
      }

      const result = {
        movies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      // Cache the result for 10 minutes
      await this.cacheService.set(cacheKey, result, { ttl: 10 * 60 });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      this.logger.error('Failed to search movies', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to search movies',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/movies/:id
   * Get movie by ID
   */
  async getMovieById(req: Request, res: Response): Promise<void> {
    try {
      const movieId = req.params.id;
      
      if (!movieId) {
        res.status(400).json({
          success: false,
          error: 'Movie ID is required'
        });
        return;
      }
      
      this.logger.info('Fetching movie by ID', { movieId });

      // Check cache first
      const cacheKey = `movie:${movieId}`;
      const cachedMovie = await this.cacheService.get(cacheKey);
      
      if (cachedMovie) {
        this.logger.info('Returning cached movie', { movieId });
        res.json({
          success: true,
          data: { movie: cachedMovie },
          cached: true
        });
        return;
      }

      // Try database first
      let movie = await this.databaseService.getMovieById(movieId);

      // If not in database, fetch from API
      if (!movie) {
        this.logger.info('Movie not in database, fetching from API', { movieId });
        movie = await this.omdbService.getMovieById(movieId);
        
        if (movie) {
          await this.databaseService.saveMovie(movie);
        }
      }

      if (!movie) {
        res.status(404).json({
          success: false,
          error: 'Movie not found'
        });
        return;
      }

      // Cache the movie for 30 minutes
      await this.cacheService.set(cacheKey, movie, { ttl: 30 * 60 });

      res.json({
        success: true,
        data: { movie }
      });

    } catch (error) {
      this.logger.error('Failed to get movie by ID', {
        movieId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch movie',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/movies/:id/card
   * Generate movie card for a specific movie
   */
  async generateMovieCard(req: Request, res: Response): Promise<void> {
    try {
      const movieId = req.params.id;
      
      if (!movieId) {
        res.status(400).json({
          success: false,
          error: 'Movie ID is required'
        });
        return;
      }
      
      const options = req.body.options || {};

      this.logger.info('Generating movie card', { movieId, options });

      // Get movie data
      let movie = await this.databaseService.getMovieById(movieId);
      
      if (!movie) {
        movie = await this.omdbService.getMovieById(movieId);
        if (movie) {
          await this.databaseService.saveMovie(movie);
        }
      }

      if (!movie) {
        res.status(404).json({
          success: false,
          error: 'Movie not found'
        });
        return;
      }

      // Check copyright compliance
      const complianceCheck = await this.copyrightService.checkMovieCompliance(movie, 'omdb');
      if (!complianceCheck.isCompliant) {
        res.status(400).json({
          success: false,
          error: 'Copyright compliance issues',
          details: complianceCheck.issues
        });
        return;
      }

      // Generate movie card
      const movieCard = await this.llmService.generateMovieCard(movie, options);

      // Validate generated content
      const contentValidation = await this.copyrightService.validateLLMContent(movieCard, movie);
      if (!contentValidation.isOriginal) {
        this.logger.warn('Generated content has originality issues', {
          movieId,
          issues: contentValidation.potentialIssues
        });
      }

      // Save to database
      await this.databaseService.saveLLMMovieCard(movieCard);

      res.json({
        success: true,
        data: {
          movieCard,
          complianceCheck,
          contentValidation
        }
      });

    } catch (error) {
      this.logger.error('Failed to generate movie card', {
        movieId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate movie card',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/movies/:id/card
   * Get existing movie card
   */
  async getMovieCard(req: Request, res: Response): Promise<void> {
    try {
      const movieId = req.params.id;

      if (!movieId) {
        res.status(400).json({
          success: false,
          error: 'Movie ID is required'
        });
        return;
      }

      this.logger.info('Fetching movie card', { movieId });

      // Check cache first
      const cacheKey = `moviecard:${movieId}`;
      const cachedCard = await this.cacheService.get(cacheKey);
      
      if (cachedCard) {
        this.logger.info('Returning cached movie card', { movieId });
        res.json({
          success: true,
          data: { movieCard: cachedCard },
          cached: true
        });
        return;
      }

      const movieCard = await this.databaseService.getLLMMovieCard(movieId);

      if (!movieCard) {
        res.status(404).json({
          success: false,
          error: 'Movie card not found'
        });
        return;
      }

      // Cache the movie card for 1 hour
      await this.cacheService.set(cacheKey, movieCard, { ttl: 60 * 60 });

      res.json({
        success: true,
        data: { movieCard }
      });

    } catch (error) {
      this.logger.error('Failed to get movie card', {
        movieId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch movie card',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/movies/batch/cards
   * Generate movie cards in batch
   */
  async generateMovieCardsBatch(req: Request, res: Response): Promise<void> {
    try {
      const { movieIds, options } = req.body;

      if (!Array.isArray(movieIds) || movieIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'movieIds array is required'
        });
        return;
      }

      if (movieIds.length > 10) {
        res.status(400).json({
          success: false,
          error: 'Maximum 10 movies allowed per batch'
        });
        return;
      }

      this.logger.info('Generating movie cards batch', { 
        movieIds, 
        count: movieIds.length 
      });

      const movies: Movie[] = [];
      
      // Fetch all movies
      for (const movieId of movieIds) {
        let movie = await this.databaseService.getMovieById(movieId);
        
        if (!movie) {
          movie = await this.omdbService.getMovieById(movieId);
          if (movie) {
            await this.databaseService.saveMovie(movie);
          }
        }
        
        if (movie) {
          movies.push(movie);
        }
      }

      // Generate cards
      const movieCards = await this.llmService.generateMovieCardsBatch(movies, options);

      // Save cards to database
      for (const card of movieCards) {
        await this.databaseService.saveLLMMovieCard(card);
      }

      res.json({
        success: true,
        data: {
          movieCards,
          generated: movieCards.length,
          requested: movieIds.length
        }
      });

    } catch (error) {
      this.logger.error('Failed to generate movie cards batch', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate movie cards batch',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/movies/health
   * Health check for movie services
   */
  async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const [omdbHealth, llmHealth, dbHealth, copyrightHealth] = await Promise.all([
        this.omdbService.healthCheck(),
        this.llmService.healthCheck(),
        this.databaseService.healthCheck(),
        this.copyrightService.healthCheck()
      ]);

      const overallStatus = [omdbHealth, llmHealth, dbHealth, copyrightHealth]
        .every(health => health.status === 'healthy') ? 'healthy' : 'unhealthy';

      res.json({
        success: true,
        status: overallStatus,
        services: {
          omdb: omdbHealth,
          llm: llmHealth,
          database: dbHealth,
          copyright: copyrightHealth
        }
      });

    } catch (error) {
      this.logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}