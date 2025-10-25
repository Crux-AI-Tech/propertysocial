import winston from 'winston';
import { Request, Response } from 'express';
import { getLogConfig, LOG_COLORS, sanitizeLogData } from '../config/logging.config';

// Add colors to winston
winston.addColors(LOG_COLORS);

// Create logger instance with configuration
const logConfig = getLogConfig();
const logger = winston.createLogger(logConfig);

// Performance monitoring
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  static startTimer(label: string): void {
    this.timers.set(label, Date.now());
  }

  static endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      logger.warn('Timer not found', { label });
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(label);
    
    logger.info('Performance metric', {
      metric: 'duration',
      label,
      duration,
      unit: 'ms'
    });

    return duration;
  }

  static measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.startTimer(label);
      try {
        const result = await fn();
        this.endTimer(label);
        resolve(result);
      } catch (error) {
        this.endTimer(label);
        reject(error);
      }
    });
  }

  static measure<T>(label: string, fn: () => T): T {
    this.startTimer(label);
    try {
      const result = fn();
      this.endTimer(label);
      return result;
    } catch (error) {
      this.endTimer(label);
      throw error;
    }
  }
}

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: Function) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  // Add request ID to request object
  (req as any).requestId = requestId;
  
  // Log incoming request
  logger.http('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    
    logger.http('Outgoing response', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      responseSize: JSON.stringify(body).length,
      userId: (req as any).user?.id,
    });

    return originalJson.call(this, body);
  };

  next();
};

// Error logging
export const logError = (error: Error, context?: any) => {
  logger.error('Application error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context,
  });
};

// Business event logging
export const logBusinessEvent = (event: string, data: any, userId?: string) => {
  logger.info('Business event', {
    event,
    data,
    userId,
    timestamp: new Date().toISOString(),
  });
};

// Security event logging
export const logSecurityEvent = (event: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
  logger.warn('Security event', {
    event,
    details,
    severity,
    timestamp: new Date().toISOString(),
  });
};

// Database query logging
export const logDatabaseQuery = (query: string, duration: number, params?: any) => {
  logger.debug('Database query', {
    query: query.substring(0, 500), // Truncate long queries
    duration,
    params,
  });
};

// API metrics logging
export const logApiMetrics = (endpoint: string, method: string, statusCode: number, duration: number, userId?: string) => {
  logger.info('API metrics', {
    metric: 'api_request',
    endpoint,
    method,
    statusCode,
    duration,
    userId,
  });
};

// User activity logging
export const logUserActivity = (userId: string, action: string, details?: any) => {
  logger.info('User activity', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
};

// System health logging
export const logSystemHealth = (component: string, status: 'healthy' | 'degraded' | 'unhealthy', metrics?: any) => {
  const level = status === 'healthy' ? 'info' : status === 'degraded' ? 'warn' : 'error';
  
  logger.log(level, 'System health', {
    component,
    status,
    metrics,
    timestamp: new Date().toISOString(),
  });
};

// Generate unique request ID
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Structured logging helpers
export const createLogger = (service: string) => {
  return {
    info: (message: string, meta?: any) => logger.info(message, { service, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { service, ...meta }),
    error: (message: string, meta?: any) => logger.error(message, { service, ...meta }),
    debug: (message: string, meta?: any) => logger.debug(message, { service, ...meta }),
  };
};

export default logger;