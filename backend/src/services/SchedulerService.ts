import cron from 'node-cron';
import { OMDbService } from './OMDbService';
import { LLMService } from './LLMService';
import { DatabaseService } from './DatabaseService';
import { CacheService } from './CacheService';
import { Logger } from '../utils/Logger';

export interface JobConfig {
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
}

export interface SchedulerStats {
  totalJobs: number;
  activeJobs: number;
  completedRuns: number;
  failedRuns: number;
  uptime: number;
}

export class SchedulerService {
  private omdbService: OMDbService;
  private llmService: LLMService;
  private databaseService: DatabaseService;
  private cacheService: CacheService;
  private logger: Logger;
  private jobs: Map<string, { task: cron.ScheduledTask; config: JobConfig }>;
  private startTime: Date;

  constructor(
    omdbService: OMDbService,
    llmService: LLMService,
    databaseService: DatabaseService,
    cacheService: CacheService
  ) {
    this.omdbService = omdbService;
    this.llmService = llmService;
    this.databaseService = databaseService;
    this.cacheService = cacheService;
    this.logger = new Logger();
    this.jobs = new Map();
    this.startTime = new Date();

    this.initializeJobs();
  }

  private initializeJobs(): void {
    try {
      // Update trending movies daily at midnight
      this.scheduleJob(
        'updateTrendingMovies',
        process.env.TRENDING_UPDATE_CRON || '0 0 * * *',
        this.updateTrendingMoviesJob.bind(this),
        true
      );

      // Cache cleanup daily at 2 AM
      this.scheduleJob(
        'cacheCleanup',
        process.env.CACHE_CLEANUP_CRON || '0 2 * * *',
        this.cacheCleanupJob.bind(this),
        true
      );

      // Generate usage reports daily at 1 AM
      this.scheduleJob(
        'generateUsageReport',
        process.env.USAGE_REPORT_CRON || '0 1 * * *',
        this.generateUsageReportJob.bind(this),
        true
      );

      // Health check every 5 minutes
      this.scheduleJob(
        'healthCheck',
        '*/5 * * * *',
        this.healthCheckJob.bind(this),
        true
      );

      // Database maintenance weekly on Sunday at 3 AM
      this.scheduleJob(
        'databaseMaintenance',
        '0 3 * * 0',
        this.databaseMaintenanceJob.bind(this),
        true
      );

      // Generate movie cards for trending movies every 6 hours
      this.scheduleJob(
        'generateTrendingMovieCards',
        '0 */6 * * *',
        this.generateTrendingMovieCardsJob.bind(this),
        true
      );

      this.logger.info('Scheduled jobs initialized', {
        totalJobs: this.jobs.size,
        activeJobs: Array.from(this.jobs.values()).filter(j => j.config.enabled).length
      });

    } catch (error) {
      this.logger.error('Failed to initialize scheduled jobs', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private scheduleJob(
    name: string,
    schedule: string,
    jobFunction: () => Promise<void>,
    enabled: boolean = true
  ): void {
    try {
      const config: JobConfig = {
        name,
        schedule,
        enabled,
        runCount: 0,
        errorCount: 0
      };

      const task = cron.schedule(schedule, async () => {
        if (!config.enabled) {
          return;
        }

        const startTime = Date.now();
        config.lastRun = new Date();

        try {
          this.logger.info(`Starting scheduled job: ${name}`);
          
          await jobFunction();
          
          config.runCount++;
          const duration = Date.now() - startTime;
          
          this.logger.info(`Completed scheduled job: ${name}`, {
            duration: `${duration}ms`,
            runCount: config.runCount
          });

        } catch (error) {
          config.errorCount++;
          const duration = Date.now() - startTime;
          
          this.logger.error(`Failed scheduled job: ${name}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: `${duration}ms`,
            errorCount: config.errorCount
          });
        }

        // Calculate next run time
        config.nextRun = this.getNextRunTime(schedule);
      }, {
        scheduled: enabled,
        timezone: process.env.TZ || 'UTC'
      });

      this.jobs.set(name, { task, config });

      this.logger.info(`Scheduled job registered: ${name}`, {
        schedule,
        enabled,
        nextRun: this.getNextRunTime(schedule)
      });

    } catch (error) {
      this.logger.error(`Failed to schedule job: ${name}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private getNextRunTime(_schedule: string): Date {
    try {
      // This is a simplified calculation - in production you might want to use a more robust library
      // TODO: Parse the schedule parameter to calculate actual next run time
      const now = new Date();
      const nextRun = new Date(now.getTime() + 60000); // Default to 1 minute from now
      return nextRun;
    } catch (error) {
      return new Date(Date.now() + 60000);
    }
  }

  /**
   * Update trending movies job
   */
  private async updateTrendingMoviesJob(): Promise<void> {
    try {
      this.logger.info('Starting trending movies update job');

      // Fetch trending movies from API
      const trendingMovies = await this.omdbService.getTrendingMovies();

      if (trendingMovies.length === 0) {
        this.logger.warn('No trending movies fetched');
        return;
      }

      // Fetch full movie details and save to database
      const savedMovies = [];
      for (const partialMovie of trendingMovies) {
        try {
          // Check if movie already exists in database
          let fullMovie = await this.databaseService.getMovieById(partialMovie.imdbId!);
          
          if (!fullMovie) {
            // Fetch full movie details from OMDb API
            fullMovie = await this.omdbService.getMovieById(partialMovie.imdbId!);
            if (fullMovie) {
              fullMovie = await this.databaseService.saveMovie(fullMovie);
            }
          }
          
          if (fullMovie) {
            savedMovies.push(fullMovie);
          }
        } catch (error) {
          this.logger.error('Failed to save trending movie', {
            movieId: partialMovie.imdbId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Update trending movies table
      const trendingData = savedMovies.map((movie, index) => ({
        id: `trending_${movie.imdbId}_${Date.now()}`,
        movieId: movie.imdbId,
        trendDate: new Date(),
        trendRank: index + 1,
        trendScore: 100 - index,
        trendSource: 'omdb_api',
        createdAt: new Date()
      }));

      await this.databaseService.saveTrendingMovies(trendingData);

      // Clear trending movies cache
      await this.cacheService.clearByPattern('trending:*');

      this.logger.info('Trending movies update job completed', {
        moviesUpdated: savedMovies.length,
        totalFetched: trendingMovies.length
      });

    } catch (error) {
      this.logger.error('Trending movies update job failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Cache cleanup job
   */
  private async cacheCleanupJob(): Promise<void> {
    try {
      this.logger.info('Starting cache cleanup job');

      const stats = await this.cacheService.getStats();
      
      // Clear expired keys and optimize memory
      await this.cacheService.clearByPattern('temp:*');
      await this.cacheService.clearByPattern('search:*');

      const newStats = await this.cacheService.getStats();

      this.logger.info('Cache cleanup job completed', {
        beforeKeys: stats.totalKeys,
        afterKeys: newStats.totalKeys,
        keysRemoved: stats.totalKeys - newStats.totalKeys,
        memoryBefore: stats.memoryUsage,
        memoryAfter: newStats.memoryUsage
      });

    } catch (error) {
      this.logger.error('Cache cleanup job failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate usage report job
   */
  private async generateUsageReportJob(): Promise<void> {
    try {
      this.logger.info('Starting usage report generation job');

      // Get API usage statistics
      const omdbHealth = await this.omdbService.healthCheck();
      const llmHealth = await this.llmService.healthCheck();
      const dbHealth = await this.databaseService.healthCheck();
      const cacheStats = await this.cacheService.getStats();

      const report = {
        date: new Date(),
        services: {
          omdb: omdbHealth,
          llm: llmHealth,
          database: dbHealth
        },
        cache: cacheStats,
        scheduler: this.getStats()
      };

      // Log the report
      this.logger.info('Daily usage report generated', report);

      // You could also save this to database or send via email
      // await this.databaseService.saveUsageReport(report);

    } catch (error) {
      this.logger.error('Usage report generation job failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Health check job
   */
  private async healthCheckJob(): Promise<void> {
    try {
      const [omdbHealth, llmHealth, dbHealth, cacheHealth] = await Promise.all([
        this.omdbService.healthCheck(),
        this.llmService.healthCheck(),
        this.databaseService.healthCheck(),
        this.cacheService.healthCheck()
      ]);

      const unhealthyServices = [];
      
      if (omdbHealth.status !== 'healthy') unhealthyServices.push('OMDb');
      if (llmHealth.status !== 'healthy') unhealthyServices.push('LLM');
      if (dbHealth.status !== 'healthy') unhealthyServices.push('Database');
      if (cacheHealth.status !== 'healthy') unhealthyServices.push('Cache');

      if (unhealthyServices.length > 0) {
        this.logger.warn('Unhealthy services detected', {
          unhealthyServices,
          services: { omdbHealth, llmHealth, dbHealth, cacheHealth }
        });
      } else {
        this.logger.debug('All services healthy');
      }

    } catch (error) {
      this.logger.error('Health check job failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw error for health checks
    }
  }

  /**
   * Database maintenance job
   */
  private async databaseMaintenanceJob(): Promise<void> {
    try {
      this.logger.info('Starting database maintenance job');

      // Clean up old API usage logs (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // You would implement these methods in DatabaseService
      // await this.databaseService.cleanupOldApiLogs(thirtyDaysAgo);
      // await this.databaseService.optimizeTables();
      // await this.databaseService.updateStatistics();

      this.logger.info('Database maintenance job completed');

    } catch (error) {
      this.logger.error('Database maintenance job failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate movie cards for trending movies job
   */
  private async generateTrendingMovieCardsJob(): Promise<void> {
    try {
      this.logger.info('Starting trending movie cards generation job');

      // Get trending movies without cards
      const trendingMovies = await this.databaseService.getTrendingMovies(20);
      
      const moviesNeedingCards = [];
      for (const movie of trendingMovies) {
        const existingCard = await this.databaseService.getLLMMovieCard(movie.imdbId);
        if (!existingCard) {
          moviesNeedingCards.push(movie);
        }
      }

      if (moviesNeedingCards.length === 0) {
        this.logger.info('All trending movies already have cards');
        return;
      }

      // Generate cards in batches of 5 to avoid overwhelming the LLM API
      const batchSize = 5;
      let generatedCount = 0;

      for (let i = 0; i < moviesNeedingCards.length; i += batchSize) {
        const batch = moviesNeedingCards.slice(i, i + batchSize);
        
        try {
          const movieCards = await this.llmService.generateMovieCardsBatch(batch);
          
          // Save cards to database
          for (const card of movieCards) {
            await this.databaseService.saveLLMMovieCard(card);
            generatedCount++;
          }

          // Small delay between batches to respect rate limits
          if (i + batchSize < moviesNeedingCards.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          this.logger.error('Failed to generate batch of movie cards', {
            batchStart: i,
            batchSize: batch.length,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.logger.info('Trending movie cards generation job completed', {
        moviesProcessed: moviesNeedingCards.length,
        cardsGenerated: generatedCount
      });

    } catch (error) {
      this.logger.error('Trending movie cards generation job failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Start all enabled jobs
   */
  start(): void {
    try {
      let startedCount = 0;

      for (const [name, { task, config }] of this.jobs) {
        if (config.enabled) {
          task.start();
          startedCount++;
          this.logger.info(`Started scheduled job: ${name}`);
        }
      }

      this.logger.info('Scheduler service started', {
        totalJobs: this.jobs.size,
        startedJobs: startedCount
      });

    } catch (error) {
      this.logger.error('Failed to start scheduler service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Stop all jobs
   */
  stop(): void {
    try {
      let stoppedCount = 0;

      for (const [name, { task }] of this.jobs) {
        task.stop();
        stoppedCount++;
        this.logger.info(`Stopped scheduled job: ${name}`);
      }

      this.logger.info('Scheduler service stopped', {
        stoppedJobs: stoppedCount
      });

    } catch (error) {
      this.logger.error('Failed to stop scheduler service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Enable/disable a specific job
   */
  toggleJob(name: string, enabled: boolean): boolean {
    const job = this.jobs.get(name);
    
    if (!job) {
      this.logger.warn(`Job not found: ${name}`);
      return false;
    }

    job.config.enabled = enabled;

    if (enabled) {
      job.task.start();
      this.logger.info(`Enabled job: ${name}`);
    } else {
      job.task.stop();
      this.logger.info(`Disabled job: ${name}`);
    }

    return true;
  }

  /**
   * Run a job manually
   */
  async runJob(name: string): Promise<boolean> {
    const job = this.jobs.get(name);
    
    if (!job) {
      this.logger.warn(`Job not found: ${name}`);
      return false;
    }

    try {
      this.logger.info(`Manually running job: ${name}`);
      
      // Get the job function based on name
      const jobFunctions: Record<string, () => Promise<void>> = {
        updateTrendingMovies: this.updateTrendingMoviesJob.bind(this),
        cacheCleanup: this.cacheCleanupJob.bind(this),
        generateUsageReport: this.generateUsageReportJob.bind(this),
        healthCheck: this.healthCheckJob.bind(this),
        databaseMaintenance: this.databaseMaintenanceJob.bind(this),
        generateTrendingMovieCards: this.generateTrendingMovieCardsJob.bind(this)
      };

      const jobFunction = jobFunctions[name];
      if (jobFunction) {
        await jobFunction();
        job.config.runCount++;
        this.logger.info(`Manually completed job: ${name}`);
        return true;
      } else {
        this.logger.error(`Job function not found: ${name}`);
        return false;
      }

    } catch (error) {
      job.config.errorCount++;
      this.logger.error(`Manually run job failed: ${name}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get job configurations
   */
  getJobs(): JobConfig[] {
    return Array.from(this.jobs.values()).map(({ config }) => config);
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    const jobs = Array.from(this.jobs.values());
    
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.config.enabled).length,
      completedRuns: jobs.reduce((sum, j) => sum + j.config.runCount, 0),
      failedRuns: jobs.reduce((sum, j) => sum + j.config.errorCount, 0),
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000)
    };
  }

  /**
   * Health check for scheduler service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const stats = this.getStats();
      const jobs = this.getJobs();

      return {
        status: 'healthy',
        details: {
          ...stats,
          jobs: jobs.map(job => ({
            name: job.name,
            enabled: job.enabled,
            lastRun: job.lastRun,
            runCount: job.runCount,
            errorCount: job.errorCount
          }))
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
}