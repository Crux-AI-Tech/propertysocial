import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
export const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
export const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(logColors);

// Define structured log format
export const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, service, requestId, userId, ...meta } = info;
    
    const logEntry = {
      '@timestamp': timestamp,
      level,
      message,
      ...(service && { service }),
      ...(requestId && { requestId }),
      ...(userId && { userId }),
      ...(stack && { stack }),
      ...(Object.keys(meta).length > 0 && { metadata: meta }),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
    };

    return JSON.stringify(logEntry);
  })
);

// Define console format for development
export const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, service, requestId, userId, ...meta } = info;
    
    let log = `${timestamp} [${level}]`;
    
    if (service) log += ` [${service}]`;
    if (requestId) log += ` [${requestId}]`;
    if (userId) log += ` [${userId}]`;
    
    log += `: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Create file transport configurations
export const createFileTransports = () => {
  const transports = [];

  // Error logs - only errors
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: structuredFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    })
  );

  // Combined logs - all levels
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: structuredFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    })
  );

  // HTTP access logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      format: structuredFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    })
  );

  // Application logs (info and above)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'application.log'),
      level: 'info',
      format: structuredFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    })
  );

  // Debug logs (development only)
  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'debug.log'),
        level: 'debug',
        format: structuredFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true,
      })
    );
  }

  return transports;
};

// Create console transport for development
export const createConsoleTransport = () => {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || 'debug',
  });
};

// Log rotation configuration
export const logRotationConfig = {
  frequency: 'daily',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  auditFile: path.join(logsDir, 'audit.json'),
  zippedArchive: true,
};

// Performance logging configuration
export const performanceConfig = {
  slowRequestThreshold: 2000, // milliseconds
  enableQueryLogging: process.env.NODE_ENV !== 'production',
  enablePerformanceMetrics: true,
};

// Security logging configuration
export const securityConfig = {
  logFailedLogins: true,
  logSecurityEvents: true,
  logSuspiciousActivity: true,
  alertThresholds: {
    failedLoginAttempts: 5,
    suspiciousActivityScore: 80,
  },
};

// Business event logging configuration
export const businessEventConfig = {
  logUserRegistrations: true,
  logPropertyViews: true,
  logTransactions: true,
  logSearches: true,
  enableAnalytics: true,
};

// Export default logging configuration
export const defaultLoggingConfig = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels: logLevels,
  format: structuredFormat,
  defaultMeta: {
    service: 'eu-real-estate-api',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
  },
  transports: [
    ...createFileTransports(),
    ...(createConsoleTransport() ? [createConsoleTransport()] : []),
  ],
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true,
};

// Sampling configuration for high-volume logs
export const samplingConfig = {
  enableSampling: process.env.NODE_ENV === 'production',
  sampleRates: {
    debug: 0.1, // Sample 10% of debug logs
    info: 0.5,  // Sample 50% of info logs
    warn: 1.0,  // Sample 100% of warn logs
    error: 1.0, // Sample 100% of error logs
  },
};

// Log aggregation configuration for external services
export const aggregationConfig = {
  elasticsearch: {
    enabled: process.env.ELASTICSEARCH_LOGGING === 'true',
    host: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    index: 'eu-real-estate-logs',
    type: 'log',
  },
  datadog: {
    enabled: process.env.DATADOG_LOGGING === 'true',
    apiKey: process.env.DATADOG_API_KEY,
    service: 'eu-real-estate-api',
    source: 'nodejs',
    tags: [`env:${process.env.NODE_ENV || 'development'}`],
  },
  cloudwatch: {
    enabled: process.env.CLOUDWATCH_LOGGING === 'true',
    logGroupName: '/aws/lambda/eu-real-estate-api',
    logStreamName: `${process.env.NODE_ENV || 'development'}-${new Date().toISOString().split('T')[0]}`,
    region: process.env.AWS_REGION || 'eu-west-1',
  },
};

// Structured logging helpers
export const createStructuredLog = (level: string, message: string, meta: any = {}) => {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
};

// Log sanitization for sensitive data
export const sanitizeLogData = (data: any): any => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'ssn',
    'creditCard',
    'bankAccount',
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
};

// Log correlation ID generator
export const generateCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

// Log context manager
export class LogContext {
  private static context: Map<string, any> = new Map();

  static set(key: string, value: any): void {
    this.context.set(key, value);
  }

  static get(key: string): any {
    return this.context.get(key);
  }

  static getAll(): Record<string, any> {
    return Object.fromEntries(this.context);
  }

  static clear(): void {
    this.context.clear();
  }

  static remove(key: string): boolean {
    return this.context.delete(key);
  }
}

export default defaultLoggingConfig;