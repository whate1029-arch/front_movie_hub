import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';

// Load environment variables
config();

// Services
import { OMDbService } from './services/OMDbService';
import { LLMService } from './services/LLMService';
import { DatabaseService } from './services/DatabaseService';
import { CopyrightService } from './services/CopyrightService';
import { CacheService } from './services/CacheService';
import { SchedulerService } from './services/SchedulerService';
import { MonitoringService } from './services/MonitoringService';

// Controllers
import { MovieController } from './controllers/MovieController';
import { AdminController } from './controllers/AdminController';

// Middleware
import { createAuthMiddleware } from './middleware/auth';

// Utils
import { Logger } from './utils/Logger';
import { ApiUsageLogger } from './utils/ApiUsageLogger';

export class App {
  public app: express.Application;
  private logger: Logger;
  private databaseService!: DatabaseService;
  private omdbService!: OMDbService;
  private llmService!: LLMService;
  private copyrightService!: CopyrightService;
  private cacheService!: CacheService;
  private schedulerService!: SchedulerService;
  private monitoringService!: MonitoringService;
  private apiUsageLogger!: ApiUsageLogger;
  private authMiddleware: any;

  // Controllers
  private movieController!: MovieController;
  private adminController!: AdminController;

  constructor() {
    this.app = express();
    this.logger = new Logger();
    
    this.initializeServices();
    this.initializeMiddleware();
    this.initializeControllers();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeServices(): void {
    try {
      // Initialize core services
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'movie_platform',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        ssl: process.env.DB_SSL === 'true'
      };
      
      this.databaseService = new DatabaseService(dbConfig);
      this.cacheService = new CacheService();
      this.omdbService = new OMDbService(process.env.OMDB_API_KEY || '');
      
      const llmConfig = {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1000'),
        temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.LLM_TIMEOUT || '30000')
      };
      
      this.apiUsageLogger = new ApiUsageLogger();
      this.llmService = new LLMService(llmConfig, this.apiUsageLogger);
      this.copyrightService = new CopyrightService();

      // Initialize monitoring and scheduler services
      this.monitoringService = new MonitoringService(this.cacheService, this.databaseService);
      this.schedulerService = new SchedulerService(
        this.omdbService,
        this.llmService,
        this.databaseService,
        this.cacheService
      );

      // Initialize auth middleware
      this.authMiddleware = createAuthMiddleware(this.databaseService);

      this.logger.info('Services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize services', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 auth requests per windowMs
      message: {
        success: false,
        error: 'Too many authentication attempts, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.app.use('/api/', generalLimiter);
    this.app.use('/api/auth/', authLimiter);

    // Access logging
    this.app.use(this.authMiddleware.logAccess);

    this.logger.info('Middleware initialized successfully');
  }

  private initializeControllers(): void {
    try {
      this.movieController = new MovieController(
        this.omdbService,
        this.llmService,
        this.databaseService,
        this.copyrightService,
        this.cacheService
      );

      this.adminController = new AdminController(
        this.omdbService,
        this.llmService,
        this.databaseService,
        this.copyrightService,
        this.apiUsageLogger,
        this.cacheService,
        this.schedulerService,
        this.monitoringService
      );

      this.logger.info('Controllers initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize controllers', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({
        success: true,
        message: 'Movie Aggregator API is running',
        timestamp: new Date(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API Info
    this.app.get('/api', (_req, res) => {
      res.json({
        success: true,
        message: 'Movie Aggregator API',
        version: '1.0.0',
        endpoints: {
          movies: '/api/movies',
          auth: '/api/auth',
          admin: '/api/admin'
        },
        documentation: '/api/docs'
      });
    });

    // Movie routes (public)
    this.app.get('/api/movies/trending', 
      this.authMiddleware.optionalAuth,
      this.movieController.getTrendingMovies.bind(this.movieController)
    );

    this.app.get('/api/movies/search', 
      this.authMiddleware.optionalAuth,
      this.movieController.searchMovies.bind(this.movieController)
    );

    this.app.get('/api/movies/:id', 
      this.authMiddleware.optionalAuth,
      this.movieController.getMovieById.bind(this.movieController)
    );

    this.app.get('/api/movies/:id/card', 
      this.authMiddleware.optionalAuth,
      this.movieController.getMovieCard.bind(this.movieController)
    );

    this.app.post('/api/movies/:id/card', 
      this.authMiddleware.authenticate,
      this.movieController.generateMovieCard.bind(this.movieController)
    );

    this.app.post('/api/movies/cards/batch', 
      this.authMiddleware.authenticate,
      this.movieController.generateMovieCardsBatch.bind(this.movieController)
    );

    this.app.get('/api/movies/health', 
      this.movieController.healthCheck.bind(this.movieController)
    );

    // Superadmin routes (require API key)
    this.app.get('/api/admin/dashboard', 
      this.authMiddleware.validateApiKey,
      this.adminController.getDashboard.bind(this.adminController)
    );

    this.app.get('/api/admin/stats', 
      this.authMiddleware.validateApiKey,
      this.adminController.getVisitorAnalytics.bind(this.adminController)
    );

    this.app.post('/api/admin/trending/update', 
      this.authMiddleware.validateApiKey,
      this.adminController.updateTrendingMovies.bind(this.adminController)
    );

    this.app.post('/api/admin/cache/clear', 
      this.authMiddleware.validateApiKey,
      this.adminController.clearCaches.bind(this.adminController)
    );

    this.app.get('/api/admin/api-usage', 
      this.authMiddleware.validateApiKey,
      this.adminController.getApiUsage.bind(this.adminController)
    );

    this.app.get('/api/admin/copyright/report', 
      this.authMiddleware.validateApiKey,
      this.adminController.getCopyrightReport.bind(this.adminController)
    );

    this.app.post('/api/admin/copyright/sources', 
      this.authMiddleware.validateApiKey,
      this.adminController.manageCopyrightSources.bind(this.adminController)
    );

    this.app.post('/api/admin/movies/batch-generate-cards', 
      this.authMiddleware.validateApiKey,
      this.adminController.batchGenerateCards.bind(this.adminController)
    );

    this.app.get('/api/admin/system/health', 
      this.authMiddleware.validateApiKey,
      this.adminController.getSystemHealth.bind(this.adminController)
    );

    this.app.post('/api/admin/system/restart-services', 
      this.authMiddleware.validateApiKey,
      this.adminController.restartServices.bind(this.adminController)
    );

    // Monitoring routes
    this.app.get('/api/admin/monitoring/metrics', 
      this.authMiddleware.validateApiKey,
      this.adminController.getMonitoringMetrics.bind(this.adminController)
    );

    this.app.get('/api/admin/monitoring/alerts', 
      this.authMiddleware.validateApiKey,
      this.adminController.getAlerts.bind(this.adminController)
    );

    this.app.post('/api/admin/monitoring/alerts/:id/resolve', 
      this.authMiddleware.validateApiKey,
      this.adminController.resolveAlert.bind(this.adminController)
    );

    // Scheduler routes
    this.app.get('/api/admin/scheduler/jobs', 
      this.authMiddleware.validateApiKey,
      this.adminController.getScheduledJobs.bind(this.adminController)
    );

    this.app.post('/api/admin/scheduler/jobs/:name/toggle', 
      this.authMiddleware.validateApiKey,
      this.adminController.toggleScheduledJob.bind(this.adminController)
    );

    this.app.post('/api/admin/scheduler/jobs/:name/run', 
      this.authMiddleware.validateApiKey,
      this.adminController.runScheduledJob.bind(this.adminController)
    );

    // Cache management routes
    this.app.get('/api/admin/cache/stats', 
      this.authMiddleware.validateApiKey,
      this.adminController.getCacheStats.bind(this.adminController)
    );

    this.app.delete('/api/admin/cache/clear', 
      this.authMiddleware.validateApiKey,
      this.adminController.clearCache.bind(this.adminController)
    );

    // Visitor analytics route
    this.app.get('/api/admin/visitors', 
      this.authMiddleware.validateApiKey,
      this.adminController.getVisitorAnalytics.bind(this.adminController)
    );

    // External API routes (require API key)
    this.app.get('/api/external/movies/trending', 
      this.authMiddleware.validateApiKey,
      this.movieController.getTrendingMovies.bind(this.movieController)
    );

    this.app.get('/api/external/movies/:id', 
      this.authMiddleware.validateApiKey,
      this.movieController.getMovieById.bind(this.movieController)
    );

    this.logger.info('Routes initialized successfully');
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });

    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      this.logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        body: req.body
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      this.logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      this.logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });

    this.logger.info('Error handling initialized successfully');
  }

  private async shutdown(): Promise<void> {
    try {
      this.logger.info('Starting graceful shutdown...');

      // Close database connections
      if (this.databaseService) {
        await this.databaseService.close();
        this.logger.info('Database connections closed');
      }

      // Clear caches
      if (this.llmService) {
        this.llmService.clearCache();
      }
      if (this.omdbService) {
        this.omdbService.clearCache();
      }

      this.logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      process.exit(1);
    }
  }

  public async start(port: number = 3001): Promise<void> {
    try {
      // Test database connection
      await this.databaseService.healthCheck();
      this.logger.info('Database connection verified');

      // Start server
      this.app.listen(port, () => {
        this.logger.info(`Movie Aggregator API server started on port ${port}`, {
          port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date()
        });
      });

    } catch (error) {
      this.logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

export default App;