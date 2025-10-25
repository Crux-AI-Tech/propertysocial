import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { redis } from '@eu-real-estate/database';
import { logger } from '../utils/logger';

/**
 * Redis store for rate limiter
 */
const RedisStore = {
  /**
   * Increment key and get current count
   */
  async increment(key: string, ttl: number): Promise<number> {
    try {
      const exists = await redis.exists(key);
      
      if (!exists) {
        await redis.set(key, '1', ttl);
        return 1;
      }
      
      const count = await redis.get(key);
      const newCount = parseInt(count || '0') + 1;
      await redis.set(key, newCount.toString(), ttl);
      
      return newCount;
    } catch (error) {
      logger.error('Redis rate limiter error:', error);
      return 0; // Allow request on Redis error
    }
  },
  
  /**
   * Reset key
   */
  async reset(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Redis rate limiter reset error:', error);
    }
  },
};

/**
 * Create a rate limiter middleware
 */
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  keyPrefix?: string;
}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests, please try again later.',
    keyPrefix = 'rl:',
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        timestamp: new Date().toISOString(),
      },
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req) => {
      return `${keyPrefix}${req.ip}`;
    },
    skip: (req) => {
      // Skip rate limiting for health check endpoint
      return req.path === '/health';
    },
    handler: (req, res, next, options) => {
      res.status(429).json(options.message);
    },
    store: {
      init: () => {},
      increment: async (req, res, next, options) => {
        const key = options.keyGenerator!(req, res);
        const ttl = Math.ceil(options.windowMs / 1000);
        return await RedisStore.increment(key, ttl);
      },
      decrement: () => Promise.resolve(),
      resetKey: async (key) => {
        await RedisStore.reset(key);
      },
      resetAll: () => Promise.resolve(),
    },
  });
};

/**
 * Auth rate limiter - stricter limits for authentication endpoints
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  keyPrefix: 'rl:auth:',
});

/**
 * Login rate limiter - even stricter for login attempts
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 login attempts per hour
  message: 'Too many login attempts, please try again later.',
  keyPrefix: 'rl:login:',
});

/**
 * API rate limiter - general API rate limiting
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per 15 minutes
  message: 'Too many requests, please try again later.',
  keyPrefix: 'rl:api:',
});