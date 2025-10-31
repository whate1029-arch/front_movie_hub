import { Pool } from 'pg';
import { Movie, LLMMovieCard, TrendingMovie } from '../models/Movie';
import { User, UserFavorite } from '../models/User';
import { Logger } from '../utils/Logger';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface SearchOptions extends PaginationOptions {
  genre?: string;
  year?: number;
  minRating?: number;
  maxRating?: number;
}

export class DatabaseService {
  private pool: Pool;
  private logger: Logger;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    });

    this.logger = new Logger();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', () => {
      this.logger.info('Database connection established');
    });

    this.pool.on('error', (err) => {
      this.logger.error('Database pool error', { error: err.message });
    });
  }

  // Movie Operations
  async saveMovie(movie: Movie): Promise<Movie> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert or update movie
      const movieQuery = `
        INSERT INTO movies (
          imdb_id, title, original_title, year, released, runtime, 
          plot, language, country, director, writer, awards, poster, 
          metascore, imdb_rating, api_source, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
        )
        ON CONFLICT (imdb_id) 
        DO UPDATE SET
          title = EXCLUDED.title,
          original_title = EXCLUDED.original_title,
          year = EXCLUDED.year,
          released = EXCLUDED.released,
          runtime = EXCLUDED.runtime,
          plot = EXCLUDED.plot,
          language = EXCLUDED.language,
          country = EXCLUDED.country,
          director = EXCLUDED.director,
          writer = EXCLUDED.writer,
          awards = EXCLUDED.awards,
          poster = EXCLUDED.poster,
          metascore = EXCLUDED.metascore,
          imdb_rating = EXCLUDED.imdb_rating,
          api_source = EXCLUDED.api_source,
          updated_at = NOW()
        RETURNING *`;

      const movieResult = await client.query(movieQuery, [
        movie.imdbId, movie.title, movie.originalTitle, movie.releaseYear, movie.releaseDate,
        movie.runtimeMinutes, movie.plotSummary, movie.language, movie.country, 
        movie.director, movie.writer, movie.awards, movie.posterUrl,
        movie.ratingMetacritic, movie.ratingImdb, movie.apiSource
      ]);

      await client.query('COMMIT');
      
      this.logger.info('Movie saved to database', { imdbId: movie.imdbId });
      return this.mapRowToMovie(movieResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to save movie', { 
        imdbId: movie.imdbId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async getMovieById(imdbId: string): Promise<Movie | null> {
    try {
      const query = 'SELECT * FROM movies WHERE imdb_id = $1';
      const result = await this.pool.query(query, [imdbId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToMovie(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to get movie by ID', { 
        imdbId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async searchMovies(searchTerm: string, options: SearchOptions): Promise<{ movies: Movie[]; total: number }> {
    try {
      const offset = (options.page - 1) * options.limit;
      let whereClause = 'WHERE (title ILIKE $1 OR actors ILIKE $1 OR director ILIKE $1)';
      let params: any[] = [`%${searchTerm}%`];
      let paramIndex = 2;

      // Add filters
      if (options.genre) {
        whereClause += ` AND genre ILIKE $${paramIndex}`;
        params.push(`%${options.genre}%`);
        paramIndex++;
      }

      if (options.year) {
        whereClause += ` AND year = $${paramIndex}`;
        params.push(options.year.toString());
        paramIndex++;
      }

      if (options.minRating) {
        whereClause += ` AND CAST(imdb_rating AS FLOAT) >= $${paramIndex}`;
        params.push(options.minRating);
        paramIndex++;
      }

      if (options.maxRating) {
        whereClause += ` AND CAST(imdb_rating AS FLOAT) <= $${paramIndex}`;
        params.push(options.maxRating);
        paramIndex++;
      }

      // Count query
      const countQuery = `SELECT COUNT(*) FROM movies ${whereClause}`;
      const countResult = await this.pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Data query
      const sortBy = options.sortBy || 'created_at';
      const sortOrder = options.sortOrder || 'DESC';
      const dataQuery = `
        SELECT * FROM movies ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(options.limit, offset);

      const dataResult = await this.pool.query(dataQuery, params);
      const movies = dataResult.rows.map(row => this.mapRowToMovie(row));

      return { movies, total };
    } catch (error) {
      this.logger.error('Failed to search movies', { 
        searchTerm, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  // LLM Movie Card Operations
  async saveLLMMovieCard(movieCard: LLMMovieCard): Promise<LLMMovieCard> {
    try {
      const query = `
        INSERT INTO llm_movie_cards (
          id, movie_id, generated_summary, generated_title, key_themes,
          target_audience, mood_tags, llm_model, generation_prompt,
          generation_timestamp, quality_score, is_approved, approved_by, approved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          generated_summary = EXCLUDED.generated_summary,
          generated_title = EXCLUDED.generated_title,
          key_themes = EXCLUDED.key_themes,
          target_audience = EXCLUDED.target_audience,
          mood_tags = EXCLUDED.mood_tags,
          llm_model = EXCLUDED.llm_model,
          generation_prompt = EXCLUDED.generation_prompt,
          generation_timestamp = EXCLUDED.generation_timestamp,
          quality_score = EXCLUDED.quality_score,
          is_approved = EXCLUDED.is_approved,
          approved_by = EXCLUDED.approved_by,
          approved_at = EXCLUDED.approved_at
        RETURNING *`;

      const result = await this.pool.query(query, [
        movieCard.id, movieCard.movieId, movieCard.generatedSummary, movieCard.generatedTitle,
        JSON.stringify(movieCard.keyThemes), movieCard.targetAudience, JSON.stringify(movieCard.moodTags),
        movieCard.llmModel, movieCard.generationPrompt, movieCard.generationTimestamp,
        movieCard.qualityScore, movieCard.isApproved, movieCard.approvedBy, movieCard.approvedAt
      ]);

      this.logger.info('LLM movie card saved', { cardId: movieCard.id, movieId: movieCard.movieId });
      return this.mapRowToLLMMovieCard(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to save LLM movie card', { 
        cardId: movieCard.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async getLLMMovieCard(movieId: string): Promise<LLMMovieCard | null> {
    try {
      const query = 'SELECT * FROM llm_movie_cards WHERE movie_id = $1 ORDER BY generated_at DESC LIMIT 1';
      const result = await this.pool.query(query, [movieId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToLLMMovieCard(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to get LLM movie card', { 
        movieId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  // Trending Movies Operations
  async saveTrendingMovies(trendingMovies: TrendingMovie[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Clear existing trending movies
      await client.query('DELETE FROM trending_movies');
      
      // Insert new trending movies
      for (const movie of trendingMovies) {
        await client.query(`
          INSERT INTO trending_movies (id, movie_id, trend_date, trend_rank, trend_score, trend_source, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [movie.id, movie.movieId, movie.trendDate, movie.trendRank, movie.trendScore, movie.trendSource, movie.createdAt]);
      }
      
      await client.query('COMMIT');
      this.logger.info('Trending movies updated', { count: trendingMovies.length });
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to save trending movies', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async getTrendingMovies(limit: number = 20): Promise<Movie[]> {
    try {
      const query = `
        SELECT m.* FROM movies m
        JOIN trending_movies tm ON m.imdb_id = tm.movie_id
        ORDER BY tm.trend_rank ASC
        LIMIT $1
      `;
      const result = await this.pool.query(query, [limit]);
      return result.rows.map(row => this.mapRowToMovie(row));
    } catch (error) {
      this.logger.error('Failed to get trending movies', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  // User Operations
  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const query = `
        INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *
      `;
      const result = await this.pool.query(query, [
        user.username, user.email, user.passwordHash, user.role
      ]);

      this.logger.info('User created', { userId: result.rows[0].id, username: user.username });
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to create user', { 
        username: user.username, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await this.pool.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to get user by email', { 
        email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  // User Favorites Operations
  async addUserFavorite(userId: string, movieId: string): Promise<UserFavorite> {
    try {
      const query = `
        INSERT INTO user_favorites (user_id, movie_id, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, movie_id) DO NOTHING
        RETURNING *
      `;
      const result = await this.pool.query(query, [userId, movieId]);
      
      if (result.rows.length === 0) {
        // Already exists, fetch it
        const existingQuery = 'SELECT * FROM user_favorites WHERE user_id = $1 AND movie_id = $2';
        const existingResult = await this.pool.query(existingQuery, [userId, movieId]);
        return this.mapRowToUserFavorite(existingResult.rows[0]);
      }

      this.logger.info('User favorite added', { userId, movieId });
      return this.mapRowToUserFavorite(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to add user favorite', { 
        userId, movieId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async removeUserFavorite(userId: string, movieId: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM user_favorites WHERE user_id = $1 AND movie_id = $2', [userId, movieId]);
      this.logger.info('User favorite removed', { userId, movieId });
    } catch (error) {
      this.logger.error('Failed to remove user favorite', { 
        userId, movieId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async getUserFavorites(userId: string, options: PaginationOptions): Promise<{ movies: Movie[]; total: number }> {
    try {
      const offset = (options.page - 1) * options.limit;
      
      // Count query
      const countQuery = 'SELECT COUNT(*) FROM user_favorites WHERE user_id = $1';
      const countResult = await this.pool.query(countQuery, [userId]);
      const total = parseInt(countResult.rows[0].count);

      // Data query
      const dataQuery = `
        SELECT m.* FROM movies m
        JOIN user_favorites uf ON m.imdb_id = uf.movie_id
        WHERE uf.user_id = $1
        ORDER BY uf.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const dataResult = await this.pool.query(dataQuery, [userId, options.limit, offset]);
      const movies = dataResult.rows.map(row => this.mapRowToMovie(row));

      return { movies, total };
    } catch (error) {
      this.logger.error('Failed to get user favorites', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  // Health Check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const result = await this.pool.query('SELECT NOW() as current_time');
      const poolStats = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };

      return {
        status: 'healthy',
        details: {
          currentTime: result.rows[0].current_time,
          poolStats
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Cleanup
  async close(): Promise<void> {
    await this.pool.end();
    this.logger.info('Database connection pool closed');
  }

  // Mapping functions
  private mapRowToMovie(row: any): Movie {
    const movie: Movie = {
      id: row.id,
      imdbId: row.imdb_id,
      title: row.title,
      apiSource: 'omdb',
      lastUpdated: row.last_updated || new Date(),
      createdAt: row.created_at || new Date()
    };

    // Add optional properties only if they have values
    if (row.original_title) movie.originalTitle = row.original_title;
    if (row.year) movie.releaseYear = parseInt(row.year);
    if (row.released) movie.releaseDate = new Date(row.released);
    if (row.runtime) movie.runtimeMinutes = parseInt(row.runtime.replace(' min', ''));
    if (row.plot) {
      movie.plotSummary = row.plot;
      movie.plotShort = row.plot;
    }
    if (row.imdb_rating) movie.ratingImdb = parseFloat(row.imdb_rating);
    if (row.metascore) movie.ratingMetacritic = parseInt(row.metascore);
    if (row.box_office) movie.boxOfficeGross = parseInt(row.box_office.replace(/[$,]/g, ''));
    if (row.language) movie.language = row.language;
    if (row.country) movie.country = row.country;
    if (row.director) movie.director = row.director;
    if (row.writer) movie.writer = row.writer;
    if (row.awards) movie.awards = row.awards;
    if (row.poster) movie.posterUrl = row.poster;

    return movie;
  }

  private mapRowToLLMMovieCard(row: any): LLMMovieCard {
    return {
      id: row.id,
      movieId: row.movie_id,
      generatedSummary: row.generated_summary,
      generatedTitle: row.generated_title,
      keyThemes: JSON.parse(row.key_themes || '[]'),
      targetAudience: row.target_audience,
      moodTags: JSON.parse(row.mood_tags || '[]'),
      llmModel: row.llm_model,
      generationPrompt: row.generation_prompt,
      generationTimestamp: row.generation_timestamp || new Date(),
      qualityScore: row.quality_score,
      isApproved: row.is_approved || false,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at
    };
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      lastLogin: row.last_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToUserFavorite(row: any): UserFavorite {
    return {
      id: row.id,
      userId: row.user_id,
      movieId: row.movie_id,
      createdAt: row.created_at
    };
  }

  // User Operations
  async getUserById(userId: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await this.pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to get user by ID', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async updateUser(userId: string, updates: { email?: string; password?: string }): Promise<User | null> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.email) {
        updateFields.push(`email = $${paramIndex}`);
        values.push(updates.email);
        paramIndex++;
      }

      if (updates.password) {
        updateFields.push(`password = $${paramIndex}`);
        values.push(updates.password);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        // No updates provided, return current user
        return this.getUserById(userId);
      }

      updateFields.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      values.push(userId); // Add userId as the last parameter

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await this.pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      this.logger.info('User updated successfully', { userId });
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to update user', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }
}