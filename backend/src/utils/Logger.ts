// Logger utility for structured logging
import winston from 'winston';
import path from 'path';

export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
    
    // Create logs directory if it doesn't exist
    const logDir = path.join(process.cwd(), 'logs');
    
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            context: context || this.context,
            message,
            ...meta,
          });
        })
      ),
      defaultMeta: { context: this.context },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${context || this.context}] ${level}: ${message} ${metaStr}`;
            })
          ),
        }),
        
        // File transport for all logs
        new winston.transports.File({
          filename: path.join(logDir, 'app.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        
        // Separate file for errors
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });

    // Handle uncaught exceptions and unhandled rejections
    this.logger.exceptions.handle(
      new winston.transports.File({
        filename: path.join(logDir, 'exceptions.log'),
      })
    );

    this.logger.rejections.handle(
      new winston.transports.File({
        filename: path.join(logDir, 'rejections.log'),
      })
    );
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });
    } else {
      this.logger.error(message, { error });
    }
  }

  // Create child logger with additional context
  child(additionalContext: string): Logger {
    const childLogger = new Logger(`${this.context}:${additionalContext}`);
    return childLogger;
  }

  // Performance logging
  time(label: string): void {
    console.time(`${this.context}:${label}`);
  }

  timeEnd(label: string): void {
    console.timeEnd(`${this.context}:${label}`);
  }

  // HTTP request logging
  logRequest(req: any, res: any, responseTime: number): void {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
    });
  }

  // Database query logging
  logQuery(query: string, params: any[], duration: number): void {
    this.debug('Database Query', {
      query: query.replace(/\s+/g, ' ').trim(),
      params,
      duration: `${duration}ms`,
    });
  }

  // API call logging
  logApiCall(service: string, endpoint: string, method: string, statusCode: number, duration: number): void {
    this.info('External API Call', {
      service,
      endpoint,
      method,
      statusCode,
      duration: `${duration}ms`,
    });
  }
}