import crypto from 'crypto';
import { Request } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { logger } from '../utils/logger';
import { redis } from '@eu-real-estate/database';

export interface SecurityConfig {
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  slowDown: {
    windowMs: number;
    delayAfter: number;
    delayMs: number;
  };
  session: {
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
}

export interface SecurityEvent {
  type: 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 'BRUTE_FORCE_ATTEMPT' | 'SQL_INJECTION_ATTEMPT' | 'XSS_ATTEMPT' | 'CSRF_ATTEMPT';
  ip: string;
  userAgent?: string;
  userId?: string;
  endpoint: string;
  payload?: any;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface FileUploadSecurity {
  allowedMimeTypes: string[];
  maxFileSize: number;
  maxFiles: number;
  scanForViruses: boolean;
  quarantinePath: string;
}

export class SecurityService {
  private static readonly CONFIG: SecurityConfig = {
    encryption: {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      skipSuccessfulRequests: false,
    },
    slowDown: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50,
      delayMs: 500,
    },
    session: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict',
    },
  };

  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
  private static readonly BLOCKED_IPS = new Set<string>();
  private static readonly SUSPICIOUS_PATTERNS = [
    // SQL Injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /('|(\\')|(;)|(--)|(\|)|(\*)|(%27)|(%3B)|(%7C))/i,
    
    // XSS patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe\b[^>]*>/i,
    
    // Path traversal patterns
    /\.\.[\/\\]/,
    /(\.\.%2F|\.\.%5C)/i,
    
    // Command injection patterns
    /(\||&|;|\$\(|\`)/,
    /(nc|netcat|wget|curl)\s/i,
  ];

  /**
   * Initialize security middleware
   */
  static initializeMiddleware() {
    return [
      // Helmet for security headers
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.stripe.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      }),

      // Rate limiting
      this.createRateLimiter(),

      // Slow down repeated requests
      this.createSlowDown(),

      // IP blocking middleware
      this.ipBlockingMiddleware(),

      // Input sanitization
      this.inputSanitizationMiddleware(),

      // Security event logging
      this.securityLoggingMiddleware(),
    ];
  }

  /**
   * Create rate limiter middleware
   */
  static createRateLimiter() {
    return rateLimit({
      windowMs: this.CONFIG.rateLimit.windowMs,
      max: this.CONFIG.rateLimit.maxRequests,
      skipSuccessfulRequests: this.CONFIG.rateLimit.skipSuccessfulRequests,
      keyGenerator: (req: Request) => {
        return req.ip + ':' + (req.user?.id || 'anonymous');
      },
      handler: (req: Request, res: any) => {
        this.logSecurityEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user?.id,
          endpoint: req.originalUrl,
          timestamp: new Date(),
          severity: 'MEDIUM',
        });

        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
            retryAfter: Math.ceil(this.CONFIG.rateLimit.windowMs / 1000),
          },
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  /**
   * Create slow down middleware
   */
  static createSlowDown() {
    return slowDown({
      windowMs: this.CONFIG.slowDown.windowMs,
      delayAfter: this.CONFIG.slowDown.delayAfter,
      delayMs: this.CONFIG.slowDown.delayMs,
      keyGenerator: (req: Request) => {
        return req.ip + ':' + (req.user?.id || 'anonymous');
      },
    });
  }

  /**
   * IP blocking middleware
   */
  static ipBlockingMiddleware() {
    return (req: Request, res: any, next: any) => {
      if (this.BLOCKED_IPS.has(req.ip)) {
        this.logSecurityEvent({
          type: 'SUSPICIOUS_ACTIVITY',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.originalUrl,
          timestamp: new Date(),
          severity: 'HIGH',
        });

        return res.status(403).json({
          error: {
            code: 'IP_BLOCKED',
            message: 'Access denied',
          },
        });
      }
      next();
    };
  }

  /**
   * Input sanitization middleware
   */
  static inputSanitizationMiddleware() {
    return (req: Request, res: any, next: any) => {
      try {
        // Sanitize request body
        if (req.body) {
          req.body = this.sanitizeObject(req.body);
        }

        // Sanitize query parameters
        if (req.query) {
          req.query = this.sanitizeObject(req.query);
        }

        // Sanitize URL parameters
        if (req.params) {
          req.params = this.sanitizeObject(req.params);
        }

        // Check for suspicious patterns
        const suspiciousContent = this.detectSuspiciousPatterns(req);
        if (suspiciousContent) {
          this.logSecurityEvent({
            type: suspiciousContent.type,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id,
            endpoint: req.originalUrl,
            payload: suspiciousContent.payload,
            timestamp: new Date(),
            severity: 'HIGH',
          });

          return res.status(400).json({
            error: {
              code: 'MALICIOUS_INPUT_DETECTED',
              message: 'Invalid input detected',
            },
          });
        }

        next();
      } catch (error) {
        logger.error('Input sanitization error:', error);
        next();
      }
    };
  }

  /**
   * Security event logging middleware
   */
  static securityLoggingMiddleware() {
    return (req: Request, res: any, next: any) => {
      // Log failed authentication attempts
      res.on('finish', () => {
        if (req.path.includes('/auth/') && res.statusCode === 401) {
          this.logSecurityEvent({
            type: 'BRUTE_FORCE_ATTEMPT',
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.originalUrl,
            timestamp: new Date(),
            severity: 'MEDIUM',
          });
        }
      });

      next();
    };
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return input;

    return input
      // Remove null bytes
      .replace(/\0/g, '')
      // Normalize unicode
      .normalize('NFKC')
      // Trim whitespace
      .trim()
      // Limit length
      .substring(0, 10000);
  }

  /**
   * Detect suspicious patterns in request
   */
  static detectSuspiciousPatterns(req: Request): { type: SecurityEvent['type']; payload: any } | null {
    const checkContent = (content: string) => {
      for (const pattern of this.SUSPICIOUS_PATTERNS) {
        if (pattern.test(content)) {
          if (pattern.source.includes('SELECT|INSERT|UPDATE')) {
            return 'SQL_INJECTION_ATTEMPT';
          }
          if (pattern.source.includes('script|javascript')) {
            return 'XSS_ATTEMPT';
          }
          return 'SUSPICIOUS_ACTIVITY';
        }
      }
      return null;
    };

    // Check body
    if (req.body) {
      const bodyStr = JSON.stringify(req.body);
      const bodyThreat = checkContent(bodyStr);
      if (bodyThreat) {
        return { type: bodyThreat as SecurityEvent['type'], payload: req.body };
      }
    }

    // Check query parameters
    if (req.query) {
      const queryStr = JSON.stringify(req.query);
      const queryThreat = checkContent(queryStr);
      if (queryThreat) {
        return { type: queryThreat as SecurityEvent['type'], payload: req.query };
      }
    }

    // Check URL
    const urlThreat = checkContent(req.originalUrl);
    if (urlThreat) {
      return { type: urlThreat as SecurityEvent['type'], payload: req.originalUrl };
    }

    return null;
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(this.CONFIG.encryption.ivLength);
    const cipher = crypto.createCipher(this.CONFIG.encryption.algorithm, this.ENCRYPTION_KEY);
    cipher.setAAD(Buffer.from('eu-real-estate', 'utf8'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: { encrypted: string; iv: string; tag: string }): string {
    const decipher = crypto.createDecipher(this.CONFIG.encryption.algorithm, this.ENCRYPTION_KEY);
    decipher.setAAD(Buffer.from('eu-real-estate', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash password with salt
   */
  static async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcryptjs');
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Validate CSRF token
   */
  static validateCSRFToken(token: string, sessionToken: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(token, 'base64'),
      Buffer.from(sessionToken, 'base64')
    );
  }

  /**
   * Secure file upload validation
   */
  static validateFileUpload(file: any, config: FileUploadSecurity): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check file size
    if (file.size > config.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${config.maxFileSize} bytes`);
    }

    // Check MIME type
    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // Check file extension
    const allowedExtensions = config.allowedMimeTypes.map(mime => {
      const parts = mime.split('/');
      return parts[1];
    });

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      errors.push(`File extension .${fileExtension} is not allowed`);
    }

    // Check for malicious file names
    const maliciousPatterns = [
      /\.\./,
      /[<>:"|?*]/,
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(file.originalname)) {
        errors.push('Malicious file name detected');
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Scan file for viruses (placeholder for actual antivirus integration)
   */
  static async scanFileForViruses(filePath: string): Promise<{
    clean: boolean;
    threats: string[];
  }> {
    // This would integrate with an actual antivirus service like ClamAV
    // For now, return a mock implementation
    return {
      clean: true,
      threats: [],
    };
  }

  /**
   * Block IP address
   */
  static blockIP(ip: string, duration?: number): void {
    this.BLOCKED_IPS.add(ip);

    if (duration) {
      setTimeout(() => {
        this.BLOCKED_IPS.delete(ip);
      }, duration);
    }

    logger.warn(`IP ${ip} has been blocked`);
  }

  /**
   * Unblock IP address
   */
  static unblockIP(ip: string): void {
    this.BLOCKED_IPS.delete(ip);
    logger.info(`IP ${ip} has been unblocked`);
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Log to application logger
      logger.warn('Security event detected', event);

      // Store in Redis for real-time monitoring
      const key = `security:events:${Date.now()}`;
      await redis.setex(key, 86400, JSON.stringify(event)); // 24 hours TTL

      // Store in database for long-term analysis
      // This would typically go to a security events table
      
      // Check for patterns that require immediate action
      await this.analyzeSecurityEvent(event);
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  /**
   * Analyze security event for patterns
   */
  static async analyzeSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Get recent events from the same IP
      const recentEvents = await this.getRecentSecurityEvents(event.ip, 3600000); // 1 hour

      // Check for brute force patterns
      if (event.type === 'BRUTE_FORCE_ATTEMPT') {
        const bruteForceAttempts = recentEvents.filter(e => e.type === 'BRUTE_FORCE_ATTEMPT');
        if (bruteForceAttempts.length >= 5) {
          this.blockIP(event.ip, 3600000); // Block for 1 hour
          
          // Send alert to security team
          await this.sendSecurityAlert({
            type: 'BRUTE_FORCE_DETECTED',
            ip: event.ip,
            attempts: bruteForceAttempts.length,
            timeWindow: '1 hour',
          });
        }
      }

      // Check for rate limit abuse
      if (event.type === 'RATE_LIMIT_EXCEEDED') {
        const rateLimitEvents = recentEvents.filter(e => e.type === 'RATE_LIMIT_EXCEEDED');
        if (rateLimitEvents.length >= 10) {
          this.blockIP(event.ip, 7200000); // Block for 2 hours
        }
      }

      // Check for injection attempts
      if (['SQL_INJECTION_ATTEMPT', 'XSS_ATTEMPT'].includes(event.type)) {
        this.blockIP(event.ip, 86400000); // Block for 24 hours
        
        await this.sendSecurityAlert({
          type: 'INJECTION_ATTEMPT_DETECTED',
          ip: event.ip,
          attackType: event.type,
          payload: event.payload,
        });
      }
    } catch (error) {
      logger.error('Security event analysis failed:', error);
    }
  }

  /**
   * Get recent security events for IP
   */
  static async getRecentSecurityEvents(ip: string, timeWindow: number): Promise<SecurityEvent[]> {
    try {
      const keys = await redis.keys('security:events:*');
      const events: SecurityEvent[] = [];

      for (const key of keys) {
        const eventData = await redis.get(key);
        if (eventData) {
          const event = JSON.parse(eventData) as SecurityEvent;
          if (event.ip === ip && 
              Date.now() - new Date(event.timestamp).getTime() <= timeWindow) {
            events.push(event);
          }
        }
      }

      return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      logger.error('Failed to get recent security events:', error);
      return [];
    }
  }

  /**
   * Send security alert
   */
  static async sendSecurityAlert(alert: any): Promise<void> {
    try {
      // This would integrate with alerting systems like PagerDuty, Slack, etc.
      logger.error('SECURITY ALERT', alert);
      
      // Store alert for dashboard
      const key = `security:alerts:${Date.now()}`;
      await redis.setex(key, 604800, JSON.stringify(alert)); // 7 days TTL
    } catch (error) {
      logger.error('Failed to send security alert:', error);
    }
  }

  /**
   * Get security dashboard data
   */
  static async getSecurityDashboard(): Promise<{
    recentEvents: SecurityEvent[];
    blockedIPs: string[];
    alerts: any[];
    statistics: {
      totalEvents: number;
      criticalEvents: number;
      blockedIPs: number;
      topAttackTypes: Array<{ type: string; count: number }>;
    };
  }> {
    try {
      // Get recent events
      const eventKeys = await redis.keys('security:events:*');
      const recentEvents: SecurityEvent[] = [];
      
      for (const key of eventKeys) {
        const eventData = await redis.get(key);
        if (eventData) {
          recentEvents.push(JSON.parse(eventData));
        }
      }

      // Get alerts
      const alertKeys = await redis.keys('security:alerts:*');
      const alerts: any[] = [];
      
      for (const key of alertKeys) {
        const alertData = await redis.get(key);
        if (alertData) {
          alerts.push(JSON.parse(alertData));
        }
      }

      // Calculate statistics
      const criticalEvents = recentEvents.filter(e => e.severity === 'CRITICAL').length;
      const attackTypeCounts = recentEvents.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topAttackTypes = Object.entries(attackTypeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        recentEvents: recentEvents.slice(0, 100), // Last 100 events
        blockedIPs: Array.from(this.BLOCKED_IPS),
        alerts: alerts.slice(0, 50), // Last 50 alerts
        statistics: {
          totalEvents: recentEvents.length,
          criticalEvents,
          blockedIPs: this.BLOCKED_IPS.size,
          topAttackTypes,
        },
      };
    } catch (error) {
      logger.error('Failed to get security dashboard data:', error);
      return {
        recentEvents: [],
        blockedIPs: [],
        alerts: [],
        statistics: {
          totalEvents: 0,
          criticalEvents: 0,
          blockedIPs: 0,
          topAttackTypes: [],
        },
      };
    }
  }

  /**
   * Validate API key
   */
  static validateApiKey(apiKey: string): boolean {
    // This would validate against stored API keys
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    return validApiKeys.includes(apiKey);
  }

  /**
   * Generate API key
   */
  static generateApiKey(): string {
    const prefix = 'eure_';
    const key = crypto.randomBytes(32).toString('hex');
    return prefix + key;
  }

  /**
   * Secure headers middleware
   */
  static secureHeadersMiddleware() {
    return (req: Request, res: any, next: any) => {
      // Remove server information
      res.removeHeader('X-Powered-By');
      
      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      next();
    };
  }
}