import { config } from 'dotenv';
import App from './app';
import { Logger } from './utils/Logger';

// Load environment variables
config();

const logger = new Logger();

async function startServer(): Promise<void> {
  try {
    const app = new App();
    const port = parseInt(process.env.PORT || '3001', 10);

    await app.start(port);

    logger.info('Movie Aggregator API started successfully', {
      port,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    });

  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString()
  });
  
  process.exit(1);
});

// Start the server
startServer();