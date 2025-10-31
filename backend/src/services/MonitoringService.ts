import os from 'os';
// import { performance } from 'perf_hooks'; // TODO: Implement performance monitoring
import { Logger } from '../utils/Logger';
import { CacheService } from './CacheService';
import { DatabaseService } from './DatabaseService';

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  process: {
    pid: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  network: {
    hostname: string;
    platform: string;
    arch: string;
  };
}

export interface PerformanceMetrics {
  timestamp: Date;
  responseTime: {
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
  database: {
    connectionPool: {
      total: number;
      active: number;
      idle: number;
    };
    queryTime: {
      average: number;
      slow: number;
    };
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictions: number;
    memoryUsage: number;
  };
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, {
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    lastCheck: Date;
    error?: string;
  }>;
  alerts: Alert[];
  uptime: number;
}

export class MonitoringService {
  private logger: Logger;
  private cacheService?: CacheService;
  private databaseService?: DatabaseService;
  private startTime: Date;
  private metrics: {
    requests: Array<{ timestamp: number; responseTime: number; status: number; endpoint: string }>;
    errors: Array<{ timestamp: number; type: string; message: string }>;
    systemMetrics: SystemMetrics[];
  };
  private alerts: Map<string, Alert>;
  private thresholds: {
    cpu: number;
    memory: number;
    responseTime: number;
    errorRate: number;
    diskSpace: number;
  };

  constructor(cacheService?: CacheService, databaseService?: DatabaseService) {
    this.logger = new Logger();
    if (cacheService) this.cacheService = cacheService;
    if (databaseService) this.databaseService = databaseService;
    this.startTime = new Date();
    this.metrics = {
      requests: [],
      errors: [],
      systemMetrics: []
    };
    this.alerts = new Map();
    
    // Default thresholds
    this.thresholds = {
      cpu: parseFloat(process.env.CPU_THRESHOLD || '80'),
      memory: parseFloat(process.env.MEMORY_THRESHOLD || '85'),
      responseTime: parseFloat(process.env.RESPONSE_TIME_THRESHOLD || '1000'),
      errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '5'),
      diskSpace: parseFloat(process.env.DISK_SPACE_THRESHOLD || '90')
    };

    this.startMetricsCollection();
  }

  /**
   * Start collecting system metrics
   */
  private startMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Clean old metrics every 5 minutes
    setInterval(() => {
      this.cleanOldMetrics();
    }, 300000);

    // Check alerts every minute
    setInterval(() => {
      this.checkAlerts();
    }, 60000);

    this.logger.info('Monitoring service started', {
      thresholds: this.thresholds
    });
  }

  /**
   * Record a request for performance monitoring
   */
  recordRequest(endpoint: string, responseTime: number, status: number): void {
    const timestamp = Date.now();
    
    this.metrics.requests.push({
      timestamp,
      responseTime,
      status,
      endpoint
    });

    // Keep only last 1000 requests
    if (this.metrics.requests.length > 1000) {
      this.metrics.requests = this.metrics.requests.slice(-1000);
    }

    // Check for performance alerts
    if (responseTime > this.thresholds.responseTime) {
      this.createAlert(
        'high-response-time',
        'warning',
        `High response time detected: ${responseTime}ms for ${endpoint}`,
        { endpoint, responseTime, status }
      );
    }
  }

  /**
   * Record an error for monitoring
   */
  recordError(type: string, message: string, metadata?: Record<string, any>): void {
    const timestamp = Date.now();
    
    this.metrics.errors.push({
      timestamp,
      type,
      message
    });

    // Keep only last 500 errors
    if (this.metrics.errors.length > 500) {
      this.metrics.errors = this.metrics.errors.slice(-500);
    }

    this.createAlert(
      `error-${type}`,
      'error',
      `Error occurred: ${message}`,
      { type, ...metadata }
    );
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      const cpuUsage = process.cpuUsage();
      const memUsage = process.memoryUsage();
      const loadAvg = os.loadavg();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
          loadAverage: loadAvg,
          cores: os.cpus().length
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usagePercent: (usedMem / totalMem) * 100
        },
        process: {
          pid: process.pid,
          uptime: process.uptime(),
          memoryUsage: memUsage,
          cpuUsage: cpuUsage
        },
        network: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch()
        }
      };

      this.metrics.systemMetrics.push(metrics);

      // Keep only last 100 system metrics (50 minutes of data)
      if (this.metrics.systemMetrics.length > 100) {
        this.metrics.systemMetrics = this.metrics.systemMetrics.slice(-100);
      }

      // Check for system alerts
      this.checkSystemAlerts(metrics);

    } catch (error) {
      this.logger.error('Failed to collect system metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check for system-related alerts
   */
  private checkSystemAlerts(metrics: SystemMetrics): void {
    // CPU usage alert
    if (metrics.cpu.usage > this.thresholds.cpu) {
      this.createAlert(
        'high-cpu-usage',
        'warning',
        `High CPU usage: ${metrics.cpu.usage.toFixed(2)}%`,
        { cpuUsage: metrics.cpu.usage }
      );
    }

    // Memory usage alert
    if (metrics.memory.usagePercent > this.thresholds.memory) {
      this.createAlert(
        'high-memory-usage',
        'warning',
        `High memory usage: ${metrics.memory.usagePercent.toFixed(2)}%`,
        { memoryUsage: metrics.memory.usagePercent }
      );
    }

    // Load average alert (for systems with multiple cores)
    const avgLoad = metrics.cpu.loadAverage?.[0];
    if (avgLoad && avgLoad > metrics.cpu.cores * 0.8) {
      this.createAlert(
        'high-load-average',
        'warning',
        `High load average: ${avgLoad.toFixed(2)} (cores: ${metrics.cpu.cores})`,
        { loadAverage: avgLoad, cores: metrics.cpu.cores }
      );
    }
  }

  /**
   * Check for application alerts
   */
  private checkAlerts(): void {
    try {
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);

      // Check error rate
      const recentErrors = this.metrics.errors.filter(e => e.timestamp > fiveMinutesAgo);
      const recentRequests = this.metrics.requests.filter(r => r.timestamp > fiveMinutesAgo);
      
      if (recentRequests.length > 0) {
        const errorRate = (recentErrors.length / recentRequests.length) * 100;
        
        if (errorRate > this.thresholds.errorRate) {
          this.createAlert(
            'high-error-rate',
            'error',
            `High error rate: ${errorRate.toFixed(2)}% (${recentErrors.length}/${recentRequests.length})`,
            { errorRate, errorCount: recentErrors.length, requestCount: recentRequests.length }
          );
        }
      }

      // Auto-resolve old alerts
      this.autoResolveAlerts();

    } catch (error) {
      this.logger.error('Failed to check alerts', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create or update an alert
   */
  private createAlert(
    id: string,
    type: Alert['type'],
    message: string,
    metadata?: Record<string, any>
  ): void {
    const existingAlert = this.alerts.get(id);
    
    if (existingAlert && !existingAlert.resolved) {
      // Update existing alert
      existingAlert.timestamp = new Date();
      existingAlert.metadata = { ...existingAlert.metadata, ...metadata };
      return;
    }

    const alert: Alert = {
      id,
      type,
      message,
      timestamp: new Date(),
      resolved: false,
      ...(metadata && { metadata })
    };

    this.alerts.set(id, alert);

    this.logger.warn(`Alert created: ${message}`, {
      alertId: id,
      type,
      metadata
    });
  }

  /**
   * Resolve an alert
   */
  resolveAlert(id: string): boolean {
    const alert = this.alerts.get(id);
    
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.logger.info(`Alert resolved: ${alert.message}`, {
      alertId: id,
      duration: alert.resolvedAt.getTime() - alert.timestamp.getTime()
    });

    return true;
  }

  /**
   * Auto-resolve alerts that are no longer relevant
   */
  private autoResolveAlerts(): void {
    const now = Date.now();
    const autoResolveTime = 10 * 60 * 1000; // 10 minutes

    for (const [id, alert] of this.alerts) {
      if (!alert.resolved && (now - alert.timestamp.getTime()) > autoResolveTime) {
        // Check if the condition still exists
        const shouldAutoResolve = this.shouldAutoResolveAlert(id, alert);
        
        if (shouldAutoResolve) {
          this.resolveAlert(id);
        }
      }
    }
  }

  /**
   * Check if an alert should be auto-resolved
   */
  private shouldAutoResolveAlert(id: string, _alert: Alert): boolean {
    const latest = this.metrics.systemMetrics[this.metrics.systemMetrics.length - 1];
    
    if (!latest) return false;

    switch (id) {
      case 'high-cpu-usage':
        return latest.cpu.usage <= this.thresholds.cpu;
      case 'high-memory-usage':
        return latest.memory.usagePercent <= this.thresholds.memory;
      case 'high-load-average':
        return latest.cpu.loadAverage?.[0] ? latest.cpu.loadAverage[0] <= latest.cpu.cores * 0.8 : false;
      default:
        return false;
    }
  }

  /**
   * Clean old metrics to prevent memory leaks
   */
  private cleanOldMetrics(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Clean old requests
    this.metrics.requests = this.metrics.requests.filter(r => r.timestamp > oneHourAgo);
    
    // Clean old errors
    this.metrics.errors = this.metrics.errors.filter(e => e.timestamp > oneHourAgo);

    // Clean resolved alerts older than 24 hours
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    for (const [id, alert] of this.alerts) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt.getTime() < oneDayAgo) {
        this.alerts.delete(id);
      }
    }
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics | null {
    return this.metrics.systemMetrics[this.metrics.systemMetrics.length - 1] || null;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneMinuteAgo = now - (60 * 1000);

    const recentRequests = this.metrics.requests.filter(r => r.timestamp > oneHourAgo);
    const recentErrors = this.metrics.errors.filter(e => e.timestamp > oneHourAgo);
    const lastMinuteRequests = this.metrics.requests.filter(r => r.timestamp > oneMinuteAgo);

    // Calculate response time metrics
    const responseTimes = recentRequests.map(r => r.responseTime).sort((a, b) => a - b);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    // Get cache metrics if available
    let cacheMetrics = {
      hitRate: 0,
      missRate: 0,
      evictions: 0,
      memoryUsage: 0
    };

    if (this.cacheService) {
      try {
        const cacheStats = await this.cacheService.getStats();
        cacheMetrics = {
          hitRate: cacheStats.hitRate,
          missRate: 100 - cacheStats.hitRate,
          evictions: 0, // Would need to track this
          memoryUsage: parseInt(cacheStats.memoryUsage) || 0
        };
      } catch (error) {
        this.logger.error('Failed to get cache metrics', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Error breakdown by type
    const errorsByType: Record<string, number> = {};
    recentErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    });

    return {
      timestamp: new Date(),
      responseTime: {
        average: avgResponseTime,
        min: responseTimes[0] || 0,
        max: responseTimes[responseTimes.length - 1] || 0,
        p95: responseTimes[p95Index] || 0,
        p99: responseTimes[p99Index] || 0
      },
      throughput: {
        requestsPerSecond: lastMinuteRequests.length / 60,
        requestsPerMinute: lastMinuteRequests.length
      },
      errors: {
        total: recentErrors.length,
        rate: recentRequests.length > 0 ? (recentErrors.length / recentRequests.length) * 100 : 0,
        byType: errorsByType
      },
      database: {
        connectionPool: {
          total: 10, // Would get from actual pool
          active: 5,
          idle: 5
        },
        queryTime: {
          average: 50, // Would track actual query times
          slow: 2 // Number of slow queries
        }
      },
      cache: cacheMetrics
    };
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const services: HealthStatus['services'] = {};

    // Check database health
    if (this.databaseService) {
      try {
        const dbHealth = await this.databaseService.healthCheck();
        services.database = {
          status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
          lastCheck: new Date(),
          ...(dbHealth.status !== 'healthy' && { error: 'Database unhealthy' })
        };
      } catch (error) {
        services.database = {
          status: 'unhealthy',
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Check cache health
    if (this.cacheService) {
      try {
        const cacheHealth = await this.cacheService.healthCheck();
        services.cache = {
          status: cacheHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
          lastCheck: new Date(),
          ...(cacheHealth.status !== 'healthy' && { error: 'Cache unhealthy' })
        };
      } catch (error) {
        services.cache = {
          status: 'unhealthy',
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Determine overall status
    const unhealthyServices = Object.values(services).filter(s => s.status === 'unhealthy');
    const activeAlerts = Array.from(this.alerts.values()).filter(a => !a.resolved);
    
    let overallStatus: HealthStatus['status'] = 'healthy';
    if (unhealthyServices.length > 0 || activeAlerts.some(a => a.type === 'critical')) {
      overallStatus = 'unhealthy';
    } else if (activeAlerts.some(a => a.type === 'error' || a.type === 'warning')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      services,
      alerts: activeAlerts,
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000)
    };
  }

  /**
   * Get all alerts
   */
  getAlerts(includeResolved: boolean = false): Alert[] {
    const alerts = Array.from(this.alerts.values());
    
    if (includeResolved) {
      return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    
    return alerts
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Update monitoring thresholds
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    
    this.logger.info('Monitoring thresholds updated', {
      thresholds: this.thresholds
    });
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    uptime: number;
    totalRequests: number;
    totalErrors: number;
    activeAlerts: number;
    resolvedAlerts: number;
    systemMetricsCount: number;
  } {
    const alerts = Array.from(this.alerts.values());
    
    return {
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      totalRequests: this.metrics.requests.length,
      totalErrors: this.metrics.errors.length,
      activeAlerts: alerts.filter(a => !a.resolved).length,
      resolvedAlerts: alerts.filter(a => a.resolved).length,
      systemMetricsCount: this.metrics.systemMetrics.length
    };
  }
}