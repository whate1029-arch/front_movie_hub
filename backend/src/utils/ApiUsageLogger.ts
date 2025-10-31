// API Usage Logger for tracking external API calls
import { Logger } from './Logger';

export interface ApiUsageLog {
  apiSource: string;
  endpoint: string;
  requestTimestamp?: Date;
  responseStatus?: number;
  responseTimeMs?: number;
  rateLimitRemaining?: number;
  errorMessage?: string;
  requestIp?: string;
  userId?: string;
}

export class ApiUsageLogger {
  private logger: Logger;
  private usageStats: Map<string, {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalResponseTime: number;
    lastRequest: Date;
  }>;

  constructor() {
    this.logger = new Logger('ApiUsageLogger');
    this.usageStats = new Map();
  }

  /**
   * Log an API request
   */
  logRequest(logData: ApiUsageLog): void {
    const {
      apiSource,
      endpoint,
      responseStatus = 0,
      responseTimeMs = 0,
      errorMessage,
      rateLimitRemaining,
      requestIp,
      userId,
    } = logData;

    const requestTimestamp = logData.requestTimestamp || new Date();
    const isSuccess = responseStatus >= 200 && responseStatus < 300;

    // Log the request
    const logLevel = isSuccess ? 'info' : 'warn';
    this.logger[logLevel]('API Request', {
      apiSource,
      endpoint,
      requestTimestamp,
      responseStatus,
      responseTimeMs,
      rateLimitRemaining,
      errorMessage,
      requestIp,
      userId,
      success: isSuccess,
    });

    // Update usage statistics
    this.updateUsageStats(apiSource, isSuccess, responseTimeMs, requestTimestamp);

    // Log rate limit warnings
    if (rateLimitRemaining !== undefined && rateLimitRemaining < 10) {
      this.logger.warn('API Rate Limit Warning', {
        apiSource,
        rateLimitRemaining,
        endpoint,
      });
    }

    // Log slow requests
    if (responseTimeMs > 5000) { // 5 seconds
      this.logger.warn('Slow API Response', {
        apiSource,
        endpoint,
        responseTimeMs,
      });
    }
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(
    apiSource: string,
    isSuccess: boolean,
    responseTimeMs: number,
    timestamp: Date
  ): void {
    const stats = this.usageStats.get(apiSource) || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      lastRequest: timestamp,
    };

    stats.totalRequests++;
    stats.totalResponseTime += responseTimeMs;
    stats.lastRequest = timestamp;

    if (isSuccess) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }

    this.usageStats.set(apiSource, stats);
  }

  /**
   * Get usage statistics for an API source
   */
  getUsageStats(apiSource: string): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    averageResponseTime: number;
    lastRequest: Date;
  } | null {
    const stats = this.usageStats.get(apiSource);
    if (!stats) {
      return null;
    }

    return {
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      successRate: stats.totalRequests > 0 ? stats.successfulRequests / stats.totalRequests : 0,
      averageResponseTime: stats.totalRequests > 0 ? stats.totalResponseTime / stats.totalRequests : 0,
      lastRequest: stats.lastRequest,
    };
  }

  /**
   * Get all usage statistics
   */
  getAllUsageStats(): Record<string, any> {
    const allStats: Record<string, any> = {};
    
    for (const [apiSource, stats] of this.usageStats.entries()) {
      allStats[apiSource] = {
        totalRequests: stats.totalRequests,
        successfulRequests: stats.successfulRequests,
        failedRequests: stats.failedRequests,
        successRate: stats.totalRequests > 0 ? stats.successfulRequests / stats.totalRequests : 0,
        averageResponseTime: stats.totalRequests > 0 ? stats.totalResponseTime / stats.totalRequests : 0,
        lastRequest: stats.lastRequest,
      };
    }

    return allStats;
  }

  /**
   * Reset usage statistics
   */
  resetStats(apiSource?: string): void {
    if (apiSource) {
      this.usageStats.delete(apiSource);
      this.logger.info('API usage stats reset', { apiSource });
    } else {
      this.usageStats.clear();
      this.logger.info('All API usage stats reset');
    }
  }

  /**
   * Check if API source is healthy based on recent requests
   */
  isApiHealthy(apiSource: string, timeWindowMinutes: number = 5): {
    isHealthy: boolean;
    reason?: string;
    successRate?: number;
    averageResponseTime?: number;
  } {
    const stats = this.getUsageStats(apiSource);
    
    if (!stats) {
      return {
        isHealthy: false,
        reason: 'No usage data available',
      };
    }

    // Check if there have been recent requests
    const timeSinceLastRequest = Date.now() - stats.lastRequest.getTime();
    const timeWindowMs = timeWindowMinutes * 60 * 1000;

    if (timeSinceLastRequest > timeWindowMs) {
      return {
        isHealthy: true,
        reason: 'No recent requests to evaluate',
      };
    }

    // Check success rate (should be > 80%)
    if (stats.successRate < 0.8) {
      return {
        isHealthy: false,
        reason: 'Low success rate',
        successRate: stats.successRate,
      };
    }

    // Check average response time (should be < 10 seconds)
    if (stats.averageResponseTime > 10000) {
      return {
        isHealthy: false,
        reason: 'High average response time',
        averageResponseTime: stats.averageResponseTime,
      };
    }

    return {
      isHealthy: true,
      successRate: stats.successRate,
      averageResponseTime: stats.averageResponseTime,
    };
  }

  /**
   * Log API health check results
   */
  logHealthCheck(apiSource: string, isHealthy: boolean, details?: any): void {
    const logLevel = isHealthy ? 'info' : 'error';
    this.logger[logLevel]('API Health Check', {
      apiSource,
      isHealthy,
      ...details,
    });
  }

  /**
   * Generate daily usage report
   */
  generateDailyReport(): void {
    const report = {
      date: new Date().toISOString().split('T')[0],
      apis: this.getAllUsageStats(),
      summary: {
        totalApis: this.usageStats.size,
        totalRequests: 0,
        totalSuccessful: 0,
        totalFailed: 0,
        overallSuccessRate: 0,
      },
    };

    // Calculate summary
    for (const stats of Object.values(report.apis)) {
      report.summary.totalRequests += stats.totalRequests;
      report.summary.totalSuccessful += stats.successfulRequests;
      report.summary.totalFailed += stats.failedRequests;
    }

    if (report.summary.totalRequests > 0) {
      report.summary.overallSuccessRate = report.summary.totalSuccessful / report.summary.totalRequests;
    }

    this.logger.info('Daily API Usage Report', report);
  }
}