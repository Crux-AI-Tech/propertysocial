import jwt from 'jsonwebtoken';
import { redis } from '@eu-real-estate/database';
import { logger } from '../utils/logger';
import { UserRole } from '@eu-real-estate/database';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  iat?: number;
  exp?: number;
}

export class TokenService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET!;
  private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  private static readonly BLACKLIST_PREFIX = 'token:blacklist:';

  /**
   * Generate JWT tokens
   */
  static generateTokens(user: any) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.JWT_REFRESH_EXPIRES_IN }
    );

    // Calculate expiration time in seconds
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<JwtPayload> {
    // Check if token is blacklisted
    const isBlacklisted = await this.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JwtPayload;
      return decoded;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  static async verifyRefreshToken(token: string): Promise<string> {
    // Check if token is blacklisted
    const isBlacklisted = await this.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new Error('Refresh token has been revoked');
    }

    try {
      const decoded = jwt.verify(token, this.JWT_REFRESH_SECRET) as any;
      return decoded.userId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Blacklist a token
   */
  static async blacklistToken(token: string): Promise<boolean> {
    try {
      // Decode token to get expiration time
      const decoded = jwt.decode(token) as any;
      
      if (!decoded || !decoded.exp) {
        logger.error('Failed to decode token for blacklisting');
        return false;
      }

      // Calculate TTL (time to live) in seconds
      const now = Math.floor(Date.now() / 1000);
      const ttl = Math.max(0, decoded.exp - now);

      // Store token in Redis blacklist with expiration
      const key = `${this.BLACKLIST_PREFIX}${token}`;
      await redis.set(key, '1', ttl);
      
      logger.info(`Token blacklisted successfully with TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error('Failed to blacklist token:', error);
      return false;
    }
  }

  /**
   * Check if token is blacklisted
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const key = `${this.BLACKLIST_PREFIX}${token}`;
      const result = await redis.get(key);
      return result !== null;
    } catch (error) {
      logger.error('Error checking token blacklist:', error);
      return false;
    }
  }
}