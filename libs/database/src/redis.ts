import { createClient, RedisClientType } from 'redis';

class RedisClient {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Disconnected from Redis');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  // Cache operations
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await this.client.exists(key)) === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  // Hash operations
  async hGet(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hGet(key, field);
    } catch (error) {
      console.error('Redis HGET error:', error);
      return null;
    }
  }

  async hSet(key: string, field: string, value: string): Promise<boolean> {
    try {
      await this.client.hSet(key, field, value);
      return true;
    } catch (error) {
      console.error('Redis HSET error:', error);
      return false;
    }
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      console.error('Redis HGETALL error:', error);
      return {};
    }
  }

  // List operations
  async lPush(key: string, value: string): Promise<boolean> {
    try {
      await this.client.lPush(key, value);
      return true;
    } catch (error) {
      console.error('Redis LPUSH error:', error);
      return false;
    }
  }

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.lRange(key, start, stop);
    } catch (error) {
      console.error('Redis LRANGE error:', error);
      return [];
    }
  }

  // Set operations
  async sAdd(key: string, member: string): Promise<boolean> {
    try {
      await this.client.sAdd(key, member);
      return true;
    } catch (error) {
      console.error('Redis SADD error:', error);
      return false;
    }
  }

  async sMembers(key: string): Promise<string[]> {
    try {
      return await this.client.sMembers(key);
    } catch (error) {
      console.error('Redis SMEMBERS error:', error);
      return [];
    }
  }

  async sRem(key: string, member: string): Promise<boolean> {
    try {
      await this.client.sRem(key, member);
      return true;
    } catch (error) {
      console.error('Redis SREM error:', error);
      return false;
    }
  }

  // Sorted set operations
  async zAdd(key: string, score: number, member: string): Promise<boolean> {
    try {
      await this.client.zAdd(key, { score, value: member });
      return true;
    } catch (error) {
      console.error('Redis ZADD error:', error);
      return false;
    }
  }

  async zRange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.zRange(key, start, stop);
    } catch (error) {
      console.error('Redis ZRANGE error:', error);
      return [];
    }
  }
}

// Create and export Redis client instance
const redisClient = new RedisClient();
export const redis = redisClient;
export default redisClient;