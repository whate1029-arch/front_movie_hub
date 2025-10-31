import { createClient, RedisClientType } from 'redis';
import { Logger } from '../utils/Logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
  compress?: boolean; // Enable compression for large values
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: string;
  uptime: number;
}

export class CacheService {
  private redis!: RedisClientType;
  private logger: Logger;
  private defaultTTL: number;
  private keyPrefix: string;
  private stats: { hits: number; misses: number };

  constructor() {
    this.logger = new Logger();
    this.defaultTTL = parseInt(process.env.CACHE_TTL_DEFAULT || '3600', 10); // 1 hour
    this.keyPrefix = process.env.CACHE_KEY_PREFIX || 'movie-app:';
    this.stats = { hits: 0, misses: 0 };

    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      const redisUrl = process.env.REDIS_URL;
      
      if (redisUrl) {
        this.redis = createClient({
          url: redisUrl,
          socket: {
            connectTimeout: 10000,
            keepAlive: 30000
          }
        });
      } else {
        const redisConfig: any = {
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            connectTimeout: 10000,
            keepAlive: 30000
          },
          database: parseInt(process.env.REDIS_DB || '0', 10)
        };

        if (process.env.REDIS_PASSWORD) {
          redisConfig.password = process.env.REDIS_PASSWORD;
        }

        this.redis = createClient(redisConfig);
      }

      this.redis.on('connect', () => {
        this.logger.info('Redis connected successfully');
      });

      this.redis.on('error', (error: any) => {
        this.logger.error('Redis connection error', {
          error: error.message,
          stack: error.stack
        });
      });

      this.redis.on('end', () => {
        this.logger.warn('Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        this.logger.info('Redis reconnecting...');
      });

      // Connect to Redis
      this.redis.connect().catch((error) => {
        this.logger.error('Failed to connect to Redis', {
          error: error.message
        });
      });

    } catch (error) {
      this.logger.error('Failed to initialize Redis', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate cache key with prefix
   */
  private generateKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.keyPrefix;
    return `${finalPrefix}${key}`;
  }

  /**
   * Serialize data for storage
   */
  private serialize(data: any): string {
    try {
      return JSON.stringify(data);
    } catch (error) {
      this.logger.error('Failed to serialize cache data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Cache serialization failed');
    }
  }

  /**
   * Deserialize data from storage
   */
  private deserialize<T>(data: string): T {
    try {
      return JSON.parse(data);
    } catch (error) {
      this.logger.error('Failed to deserialize cache data', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Cache deserialization failed');
    }
  }

  /**
   * Set cache value
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const cacheKey = this.generateKey(key, options.prefix);
      const serializedValue = this.serialize(value);
      const ttl = options.ttl || this.defaultTTL;

      await this.redis.setEx(cacheKey, ttl, serializedValue);

      this.logger.debug('Cache set', {
        key: cacheKey,
        ttl,
        size: serializedValue.length
      });

    } catch (error) {
      this.logger.error('Failed to set cache', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw error to prevent cache failures from breaking the app
    }
  }

  /**
   * Get cache value
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key, options.prefix);
      const value = await this.redis.get(cacheKey);

      if (value === null) {
        this.stats.misses++;
        this.logger.debug('Cache miss', { key: cacheKey });
        return null;
      }

      this.stats.hits++;
      this.logger.debug('Cache hit', { key: cacheKey });
      
      return this.deserialize<T>(value);

    } catch (error) {
      this.logger.error('Failed to get cache', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Delete cache value
   */
  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    try {
      const cacheKey = this.generateKey(key, options.prefix);
      await this.redis.del(cacheKey);

      this.logger.debug('Cache deleted', { key: cacheKey });

    } catch (error) {
      this.logger.error('Failed to delete cache', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, options.prefix);
      const exists = await this.redis.exists(cacheKey);
      return exists === 1;

    } catch (error) {
      this.logger.error('Failed to check cache existence', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Set cache with expiration time
   */
  async setWithExpiry<T>(key: string, value: T, expirySeconds: number, options: CacheOptions = {}): Promise<void> {
    await this.set(key, value, { ...options, ttl: expirySeconds });
  }

  /**
   * Get or set cache value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cachedValue = await this.get<T>(key, options);
      
      if (cachedValue !== null) {
        return cachedValue;
      }

      // If not in cache, fetch the data
      const freshValue = await fetchFunction();
      
      // Store in cache for next time
      await this.set(key, freshValue, options);
      
      return freshValue;

    } catch (error) {
      this.logger.error('Failed to get or set cache', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // If cache fails, still try to fetch the data
      return await fetchFunction();
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string, options: CacheOptions = {}): Promise<number> {
    try {
      const cacheKey = this.generateKey(key, options.prefix);
      const result = await this.redis.incr(cacheKey);
      
      // Set expiry if specified
      if (options.ttl) {
        await this.redis.expire(cacheKey, options.ttl);
      }
      
      return result;

    } catch (error) {
      this.logger.error('Failed to increment cache', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Set multiple values
   */
  async setMultiple<T>(data: Record<string, T>, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || this.defaultTTL;

      const promises = Object.entries(data).map(async ([key, value]) => {
        const cacheKey = this.generateKey(key, options.prefix);
        const serializedValue = this.serialize(value);
        return this.redis.setEx(cacheKey, ttl, serializedValue);
      });

      await Promise.all(promises);

      this.logger.debug('Multiple cache values set', {
        count: Object.keys(data).length,
        ttl
      });

    } catch (error) {
      this.logger.error('Failed to set multiple cache values', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get multiple values
   */
  async getMultiple<T>(keys: string[], options: CacheOptions = {}): Promise<Record<string, T | null>> {
    try {
      const cacheKeys = keys.map(key => this.generateKey(key, options.prefix));
      const values = await this.redis.mGet(cacheKeys);

      const result: Record<string, T | null> = {};

      keys.forEach((originalKey, index) => {
        const value = values[index];
        if (value !== null && value !== undefined) {
          try {
            result[originalKey] = this.deserialize<T>(value);
            this.stats.hits++;
          } catch (error) {
            result[originalKey] = null;
            this.stats.misses++;
          }
        } else {
          result[originalKey] = null;
          this.stats.misses++;
        }
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to get multiple cache values', {
        keys,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return null for all keys on error
      const result: Record<string, T | null> = {};
      keys.forEach(key => {
        result[key] = null;
        this.stats.misses++;
      });
      return result;
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearByPattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    try {
      const searchPattern = this.generateKey(pattern, options.prefix);
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redis.del(keys);

      this.logger.info('Cache cleared by pattern', {
        pattern: searchPattern,
        deletedCount: deleted
      });

      return deleted;

    } catch (error) {
      this.logger.error('Failed to clear cache by pattern', {
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    try {
      await this.redis.flushDb();
      this.logger.info('All cache cleared');

    } catch (error) {
      this.logger.error('Failed to clear all cache', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info('memory');
      const dbSize = await this.redis.dbSize();
      
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch?.[1]?.trim() || 'Unknown';

      const totalRequests = this.stats.hits + this.stats.misses;
      const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: Math.round(hitRate * 100) / 100,
        totalKeys: dbSize,
        memoryUsage,
        uptime: process.uptime()
      };

    } catch (error) {
      this.logger.error('Failed to get cache stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: 'Unknown',
        uptime: process.uptime()
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - start;

      const info = await this.redis.info('server');
      const versionMatch = info.match(/redis_version:(.+)/);
      const version = versionMatch?.[1]?.trim() || 'Unknown';

      return {
        status: 'healthy',
        details: {
          responseTime: `${responseTime}ms`,
          version,
          connected: true
        }
      };

    } catch (error) {
      this.logger.error('Redis health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          connected: false
        }
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.info('Redis connection closed');

    } catch (error) {
      this.logger.error('Failed to close Redis connection', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
    this.logger.info('Cache statistics reset');
  }
}

// Export singleton instance
export const cacheService = new CacheService();