import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/DatabaseService';
import { Logger } from '../utils/Logger';


export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class UserController {
  private databaseService: DatabaseService;
  private logger: Logger;
  private jwtSecret: string;

  constructor(databaseService: DatabaseService, jwtSecret: string) {
    this.databaseService = databaseService;
    this.logger = new Logger();
    this.jwtSecret = jwtSecret;
  }

  /**
   * POST /api/users/register
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<void> {
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

      const { username, email, password } = req.body;

      this.logger.info('User registration attempt', { username, email });

      // Check if user already exists
      const existingUser = await this.databaseService.getUserByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User already exists with this email'
        });
        return;
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await this.databaseService.createUser({
        username,
        email,
        passwordHash,
        role: 'user',
        isActive: true,
        emailVerified: false
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: newUser.id, 
          email: newUser.email, 
          role: newUser.role 
        },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      this.logger.info('User registered successfully', { 
        userId: newUser.id, 
        username: newUser.username 
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            createdAt: newUser.createdAt
          },
          token
        }
      });

    } catch (error) {
      this.logger.error('User registration failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Registration failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/users/login
   * User login
   */
  async login(req: Request, res: Response): Promise<void> {
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

      const { email, password } = req.body;

      this.logger.info('User login attempt', { email });

      // Get user by email
      const user = await this.databaseService.getUserByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      this.logger.info('User logged in successfully', { 
        userId: user.id, 
        username: user.username 
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
          },
          token
        }
      });

    } catch (error) {
      this.logger.error('User login failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/users/profile
   * Get user profile
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const user = await this.databaseService.getUserByEmail(req.user.email);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to get user profile', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/users/favorites
   * Add movie to favorites
   */
  async addFavorite(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { movieId } = req.body;

      this.logger.info('Adding movie to favorites', { 
        userId: req.user.id, 
        movieId 
      });

      // Check if movie exists
      const movie = await this.databaseService.getMovieById(movieId);
      if (!movie) {
        res.status(404).json({
          success: false,
          error: 'Movie not found'
        });
        return;
      }

      const favorite = await this.databaseService.addUserFavorite(req.user.id, movieId);

      res.status(201).json({
        success: true,
        data: { favorite }
      });

    } catch (error) {
      this.logger.error('Failed to add favorite', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to add favorite',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /api/users/favorites/:movieId
   * Remove movie from favorites
   */
  async removeFavorite(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const movieId = req.params.movieId;

      if (!movieId) {
        res.status(400).json({
          success: false,
          error: 'Movie ID is required'
        });
        return;
      }

      this.logger.info('Removing movie from favorites', { 
        userId: req.user.id, 
        movieId 
      });

      await this.databaseService.removeUserFavorite(req.user.id, movieId);

      res.json({
        success: true,
        message: 'Movie removed from favorites'
      });

    } catch (error) {
      this.logger.error('Failed to remove favorite', {
        userId: req.user?.id,
        movieId: req.params.movieId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to remove favorite',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/users/favorites
   * Get user's favorite movies
   */
  async getFavorites(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      this.logger.info('Fetching user favorites', { 
        userId: req.user.id, 
        page, 
        limit 
      });

      const result = await this.databaseService.getUserFavorites(req.user.id, {
        page,
        limit
      });

      res.json({
        success: true,
        data: {
          movies: result.movies,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to get favorites', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get favorites',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/users/ratings
   * Rate a movie
   */
  async rateMovie(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { movieId, rating, review } = req.body;

      if (rating < 1 || rating > 10) {
        res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 10'
        });
        return;
      }

      this.logger.info('User rating movie', { 
        userId: req.user.id, 
        movieId, 
        rating 
      });

      // Check if movie exists
      const movie = await this.databaseService.getMovieById(movieId);
      if (!movie) {
        res.status(404).json({
          success: false,
          error: 'Movie not found'
        });
        return;
      }

      // For now, we'll just return success since we haven't implemented the rating table operations
      // In a full implementation, you would save the rating to the database
      res.status(201).json({
        success: true,
        data: {
          rating: {
            userId: req.user.id,
            movieId,
            rating,
            review: review || null,
            createdAt: new Date()
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to rate movie', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to rate movie',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/users/recommendations
   * Get personalized movie recommendations
   */
  async getRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;

      this.logger.info('Fetching user recommendations', { 
        userId: req.user.id, 
        limit 
      });

      // Get user's favorite movies to understand preferences
      const favorites = await this.databaseService.getUserFavorites(req.user.id, {
        page: 1,
        limit: 50
      });

      // Simple recommendation: get trending movies that user hasn't favorited
      const trendingMovies = await this.databaseService.getTrendingMovies(limit * 2);
      const favoriteIds = new Set(favorites.movies.map(movie => movie.imdbId));
      
      const recommendations = trendingMovies
        .filter(movie => !favoriteIds.has(movie.imdbId))
        .slice(0, limit);

      res.json({
        success: true,
        data: {
          recommendations,
          basedOn: {
            favoritesCount: favorites.total,
            algorithm: 'trending_filtered'
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to get recommendations', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/users/stats
   * Get user statistics
   */
  async getUserStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      this.logger.info('Fetching user stats', { userId: req.user.id });

      // Get favorites count
      const favorites = await this.databaseService.getUserFavorites(req.user.id, {
        page: 1,
        limit: 1
      });

      const stats = {
        favoritesCount: favorites.total,
        ratingsCount: 0, // Would be implemented with ratings table
        joinedDate: req.user.id, // Would get from user record
        lastActivity: new Date()
      };

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      this.logger.error('Failed to get user stats', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get user stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async refreshToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      // Generate new token
      const token = jwt.sign(
        { 
          userId: req.user.id, 
          email: req.user.email,
          role: req.user.role 
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );

      this.logger.info('Token refreshed successfully', { userId: req.user.id });

      res.json({
        success: true,
        data: { token }
      });

    } catch (error) {
      this.logger.error('Failed to refresh token', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to refresh token',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const { email, password } = req.body;

      // Validate input
      if (!email && !password) {
        res.status(400).json({
          success: false,
          error: 'At least one field (email or password) must be provided'
        });
        return;
      }

      let hashedPassword;
      if (password) {
        if (password.length < 6) {
          res.status(400).json({
            success: false,
            error: 'Password must be at least 6 characters long'
          });
          return;
        }
        hashedPassword = await bcrypt.hash(password, 10);
      }

      // Update user profile
      const updateData: { email?: string; password?: string } = {};
      
      if (email) {
        updateData.email = email;
      }
      
      if (hashedPassword) {
        updateData.password = hashedPassword;
      }
      
      const updatedUser = await this.databaseService.updateUser(req.user.id, updateData);

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      this.logger.info('User profile updated successfully', { userId: req.user.id });

      res.json({
        success: true,
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            role: updatedUser.role,
            createdAt: updatedUser.createdAt
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to update profile', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}