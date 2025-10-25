import { redis } from '@eu-real-estate/database';
import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  prefix?: string;
  tags?: string[];
  compress?: boolean;
  serialize?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
  evictions: number;
}

export class CacheService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private static readonly MAX_KEY_LENGTH = 250;
  private static readonly COMPRESSION_THRESHOLD = 1024; // 1KB

  /**
   * Get value from cache
   */
  static async get<T>(key: string, config?: Partial<CacheConfig>): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, config?.prefix);
      const value = await redis.get(fullKey);
      
      if (value === null) {
        await this.incrementStat('misses');
        return null;
      }

      await this.incrementStat('hits');
      
      // Handle decompression and deserialization
      let result = value;
      if (config?.compress && value.startsWith('COMPRESSED:')) {
        result = await this.decompress(value.substring(11));
      }
      
      if (config?.serialize !== false) {
        try {
          return JSON.parse(result);
        } catch {
          return result as T;
        }
      }
      
      return result as T;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  static async set(
    key: string, 
    value: any, 
    config?: CacheConfig
  ): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, config?.prefix);
      const ttl = config?.ttl || this.DEFAULT_TTL;
      
      let serializedValue = config?.serialize !== false 
        ? JSON.stringify(value) 
        : value;

      // Handle compression for large values
      if (config?.compress && serializedValue.length > this.COMPRESSION_THRESHOLD) {
        serializedValue = 'COMPRESSED:' + await this.compress(serializedValue);
      }

      await redis.setex(fullKey, ttl, serializedValue);
      
      // Add tags for cache invalidation
      if (config?.tags) {
        await this.addTags(fullKey, config.tags);
      }
      
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  static async del(key: string, prefix?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, prefix);
      const result = await redis.del(fullKey);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  static async exists(key: string, prefix?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, prefix);
      const result = await redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  static async mget<T>(keys: string[], prefix?: string): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.buildKey(key, prefix));
      const values = await redis.mget(...fullKeys);
      
      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value);
        } catch {
          return value as T;
        }
      });
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  static async mset(
    keyValuePairs: Record<string, any>, 
    config?: CacheConfig
  ): Promise<boolean> {
    try {
      const pipeline = redis.pipeline();
      const ttl = config?.ttl || this.DEFAULT_TTL;
      
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const fullKey = this.buildKey(key, config?.prefix);
        const serializedValue = config?.serialize !== false 
          ? JSON.stringify(value) 
          : value;
        pipeline.setex(fullKey, ttl, serializedValue);
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Increment counter in cache
   */
  static async incr(key: string, prefix?: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key, prefix);
      return await redis.incr(fullKey);
    } catch (error) {
      logger.error('Cache incr error:', error);
      return 0;
    }
  }

  /**
   * Set expiration for key
   */
  static async expire(key: string, ttl: number, prefix?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, prefix);
      const result = await redis.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Get keys matching pattern
   */
  static async keys(pattern: string): Promise<string[]> {
    try {
      return await redis.keys(pattern);
    } catch (error) {
      logger.error('Cache keys error:', error);
      return [];
    }
  }

  /**
   * Delete keys by pattern
   */
  static async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      const result = await redis.del(...keys);
      return result;
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Invalidate cache by tags
   */
  static async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let totalDeleted = 0;
      
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await redis.smembers(tagKey);
        
        if (keys.length > 0) {
          const deleted = await redis.del(...keys);
          totalDeleted += deleted;
          await redis.del(tagKey);
        }
      }
      
      return totalDeleted;
    } catch (error) {
      logger.error('Cache invalidate by tags error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<CacheStats> {
    try {
      const info = await redis.info('stats');
      const memory = await redis.info('memory');
      
      const hits = this.parseInfoValue(info, 'keyspace_hits') || 0;
      const misses = this.parseInfoValue(info, 'keyspace_misses') || 0;
      const evictions = this.parseInfoValue(info, 'evicted_keys') || 0;
      const memoryUsage = this.parseInfoValue(memory, 'used_memory') || 0;
      
      const totalRequests = hits + misses;
      const hitRate = totalRequests > 0 ? (hits / totalRequests) * 100 : 0;
      
      const totalKeys = await redis.dbsize();
      
      return {
        hits,
        misses,
        hitRate: Math.round(hitRate * 100) / 100,
        totalKeys,
        memoryUsage,
        evictions,
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: 0,
        evictions: 0,
      };
    }
  }

  /**
   * Clear all cache
   */
  static async clear(): Promise<boolean> {
    try {
      await redis.flushdb();
      return true;
    } catch (error) {
      logger.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  static async warmUp(): Promise<void> {
    try {
      logger.info('Starting cache warm-up...');
      
      // Warm up property types and amenities for common languages
      const commonLanguages = ['en', 'de', 'fr', 'es', 'it'];
      
      for (const lang of commonLanguages) {
        // This would call the localization service to populate cache
        // await LocalizationService.getLocalizedPropertyTypes(lang);
        // await LocalizationService.getLocalizedAmenities(lang);
      }
      
      logger.info('Cache warm-up completed');
    } catch (error) {
      logger.error('Cache warm-up error:', error);
    }
  }

  /**
   * Cache middleware for Express routes
   */
  static middleware(config?: CacheConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = this.generateRequestKey(req);
      const cached = await this.get(cacheKey, config);
      
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data: any) {
        res.setHeader('X-Cache', 'MISS');
        
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          CacheService.set(cacheKey, data, config).catch(error => {
            logger.error('Cache middleware set error:', error);
          });
        }
        
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Build cache key with prefix
   */
  private static buildKey(key: string, prefix?: string): string {
    const fullKey = prefix ? `${prefix}:${key}` : key;
    
    // Ensure key length doesn't exceed Redis limits
    if (fullKey.length > this.MAX_KEY_LENGTH) {
      const hash = this.hashString(fullKey);
      return prefix ? `${prefix}:${hash}` : hash;
    }
    
    return fullKey;
  }

  /**
   * Generate cache key from request
   */
  private static generateRequestKey(req: Request): string {
    const { method, path, query, user } = req;
    const userId = user?.id || 'anonymous';
    const queryString = JSON.stringify(query);
    
    return `req:${method}:${path}:${userId}:${this.hashString(queryString)}`;
  }

  /**
   * Hash string for cache key
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Add tags for cache invalidation
   */
  private static async addTags(key: string, tags: string[]): Promise<void> {
    try {
      const pipeline = redis.pipeline();
      
      tags.forEach(tag => {
        const tagKey = `tag:${tag}`;
        pipeline.sadd(tagKey, key);
        pipeline.expire(tagKey, 86400); // 24 hours
      });
      
      await pipeline.exec();
    } catch (error) {
      logger.error('Cache add tags error:', error);
    }
  }

  /**
   * Increment cache statistics
   */
  private static async incrementStat(stat: string): Promise<void> {
    try {
      await redis.incr(`cache:stats:${stat}`);
    } catch (error) {
      // Ignore stats errors
    }
  }

  /**
   * Parse Redis INFO command value
   */
  private static parseInfoValue(info: string, key: string): number | null {
    const match = info.match(new RegExp(`${key}:(\\d+)`));
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Compress string (placeholder - would use actual compression library)
   */
  private static async compress(data: string): Promise<string> {
    // In a real implementation, use zlib or similar
    return Buffer.from(data).toString('base64');
  }

  /**
   * Decompress string (placeholder - would use actual compression library)
   */
  private static async decompress(data: string): Promise<string> {
    // In a real implementation, use zlib or similar
    return Buffer.from(data, 'base64').toString();
  }
}