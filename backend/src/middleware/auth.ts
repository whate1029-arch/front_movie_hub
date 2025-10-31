import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/DatabaseService';
import { Logger } from '../utils/Logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: 'user' | 'admin';
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export class AuthMiddleware {
  private databaseService: DatabaseService;
  private logger: Logger;
  private jwtSecret: string;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
    this.logger = new Logger();
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    
    if (!process.env.JWT_SECRET) {
      this.logger.warn('JWT_SECRET not set in environment variables, using default (not secure for production)');
    }
  }

  /**
   * Generate JWT token for user
   */
  generateToken(user: { id: string; email: string; username: string; role: 'user' | 'admin' }): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '24h',
      issuer: 'movie-aggregator-api',
      audience: 'movie-aggregator-client'
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'movie-aggregator-api',
        audience: 'movie-aggregator-client'
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      this.logger.warn('JWT verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Middleware to authenticate requests
   */
  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'Authorization header required'
        });
        return;
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Token required'
        });
        return;
      }

      const decoded = this.verifyToken(token);

      if (!decoded) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
        return;
      }

      // Verify user still exists and is active
      const user = await this.databaseService.getUserById(decoded.userId);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      };

      this.logger.debug('User authenticated', {
        userId: user.id,
        username: user.username,
        role: user.role,
        endpoint: req.path
      });

      next();

    } catch (error) {
      this.logger.error('Authentication error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: req.path
      });

      res.status(500).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  };

  /**
   * Middleware to require admin role
   */
  requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (req.user.role !== 'admin') {
        this.logger.warn('Admin access denied', {
          userId: req.user.id,
          username: req.user.username,
          role: req.user.role,
          endpoint: req.path
        });

        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      this.logger.debug('Admin access granted', {
        userId: req.user.id,
        username: req.user.username,
        endpoint: req.path
      });

      next();

    } catch (error) {
      this.logger.error('Admin authorization error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: req.path
      });

      res.status(500).json({
        success: false,
        error: 'Authorization failed'
      });
    }
  };

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  optionalAuth = async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        next();
        return;
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      if (!token) {
        next();
        return;
      }

      const decoded = this.verifyToken(token);

      if (decoded) {
        const user = await this.databaseService.getUserById(decoded.userId);
        
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role
          };

          this.logger.debug('Optional auth successful', {
            userId: user.id,
            username: user.username,
            endpoint: req.path
          });
        }
      }

      next();

    } catch (error) {
      this.logger.debug('Optional auth failed, continuing without user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: req.path
      });

      // Continue without authentication for optional auth
      next();
    }
  };

  /**
   * Rate limiting middleware for authentication endpoints
   */
  authRateLimit = (() => {
    const attempts = new Map<string, { count: number; resetTime: number }>();
    const maxAttempts = 5;
    const windowMs = 15 * 60 * 1000; // 15 minutes

    return (req: Request, res: Response, next: NextFunction): void => {
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();

      // Clean up expired entries
      for (const [ip, data] of attempts.entries()) {
        if (now > data.resetTime) {
          attempts.delete(ip);
        }
      }

      const clientAttempts = attempts.get(clientIp);

      if (clientAttempts && clientAttempts.count >= maxAttempts) {
        const timeLeft = Math.ceil((clientAttempts.resetTime - now) / 1000 / 60);
        
        res.status(429).json({
          success: false,
          error: `Too many authentication attempts. Try again in ${timeLeft} minutes.`
        });
        return;
      }

      // Track this attempt
      if (clientAttempts) {
        clientAttempts.count++;
      } else {
        attempts.set(clientIp, {
          count: 1,
          resetTime: now + windowMs
        });
      }

      next();
    };
  })();

  /**
   * Middleware to log API access
   */
  logAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      this.logger.info('API access', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
      });
    });

    next();
  };

  /**
   * Middleware to validate API key for external access
   */
  validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'] as string;
    const validApiKey = process.env.API_KEY;

    if (!validApiKey) {
      this.logger.warn('API_KEY not configured in environment variables');
      res.status(500).json({
        success: false,
        error: 'API key validation not configured'
      });
      return;
    }

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: 'API key required'
      });
      return;
    }

    if (apiKey !== validApiKey) {
      this.logger.warn('Invalid API key attempt', {
        providedKey: apiKey.substring(0, 8) + '...',
        ip: req.ip || req.connection.remoteAddress
      });

      res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
      return;
    }

    next();
  };
}

// Export middleware factory
export const createAuthMiddleware = (databaseService: DatabaseService): AuthMiddleware => {
  return new AuthMiddleware(databaseService);
};