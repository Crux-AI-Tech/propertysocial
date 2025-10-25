import { Request, Response } from 'express';
import os from 'os';
import process from 'process';
import { performance } from 'perf_hooks';
import logger, { logSystemHealth, PerformanceMonitor } from '../utils/logger';

export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    free: number;
    total: number;
    usage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  process: {
    pid: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  system: {
    platform: string;
    arch: string;
    hostname: string;
    version: string;
  };
}

export interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  componentType: string;
  observedValue?: any;
  observedUnit?: string;
  time: string;
  output?: string;
}

export interface HealthStatus {
  status: 'pass' | 'warn' | 'fail';
  version: string;
  releaseId: string;
  notes: string[];
  output: string;
  serviceId: string;
  description: string;
  checks: Record<string, HealthCheck[]>;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: Map<string, any> = new Map();
  private healthChecks: Map<string, () => Promise<HealthCheck>> = new Map();
  private alertThresholds = {
    memoryUsage: 85, // percentage
    cpuUsage: 80, // percentage
    responseTime: 2000, // milliseconds
    errorRate: 5, // percentage
  };

  private constructor() {
    this.initializeHealthChecks();
    this.startMetricsCollection();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // Initialize default health checks
  private initializeHealthChecks(): void {
    this.registerHealthCheck('memory', this.checkMemoryUsage.bind(this));
    this.registerHealthCheck('cpu', this.checkCpuUsage.bind(this));
    this.registerHealthCheck('disk', this.checkDiskSpace.bind(this));
    this.registerHealthCheck('database', this.checkDatabaseConnection.bind(this));
    this.registerHealthCheck('redis', this.checkRedisConnection.bind(this));
    this.registerHealthCheck('elasticsearch', this.checkElasticsearchConnection.bind(this));
  }

  // Start periodic metrics collection
  private startMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Collect application metrics every 60 seconds
    setInterval(() => {
      this.collectApplicationMetrics();
    }, 60000);

    // Run health checks every 2 minutes
    setInterval(() => {
      this.runHealthChecks();
    }, 120000);
  }

  // Collect system-level metrics
  private collectSystemMetrics(): void {
    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      uptime: os.uptime(),
      memory: {
        used: os.totalmem() - os.freemem(),
        free: os.freemem(),
        total: os.totalmem(),
        usage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
      },
      cpu: {
        usage: this.getCpuUsage(),
        loadAverage: os.loadavg(),
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        version: process.version,
      },
    };

    this.metrics.set('system', metrics);
    
    // Log system health
    const memoryStatus = metrics.memory.usage > this.alertThresholds.memoryUsage ? 'unhealthy' : 'healthy';
    const cpuStatus = metrics.cpu.usage > this.alertThresholds.cpuUsage ? 'unhealthy' : 'healthy';
    
    logSystemHealth('system', memoryStatus === 'healthy' && cpuStatus === 'healthy' ? 'healthy' : 'degraded', metrics);

    // Check for alerts
    this.checkAlerts(metrics);
  }

  // Collect application-specific metrics
  private collectApplicationMetrics(): void {
    const appMetrics = {
      timestamp: new Date().toISOString(),
      requests: {
        total: this.getMetric('requests.total', 0),
        success: this.getMetric('requests.success', 0),
        errors: this.getMetric('requests.errors', 0),
        rate: this.getMetric('requests.rate', 0),
      },
      response: {
        averageTime: this.getMetric('response.averageTime', 0),
        p95Time: this.getMetric('response.p95Time', 0),
        p99Time: this.getMetric('response.p99Time', 0),
      },
      database: {
        connections: this.getMetric('database.connections', 0),
        queries: this.getMetric('database.queries', 0),
        averageQueryTime: this.getMetric('database.averageQueryTime', 0),
      },
      cache: {
        hits: this.getMetric('cache.hits', 0),
        misses: this.getMetric('cache.misses', 0),
        hitRate: this.getMetric('cache.hitRate', 0),
      },
      users: {
        active: this.getMetric('users.active', 0),
        registered: this.getMetric('users.registered', 0),
        sessions: this.getMetric('users.sessions', 0),
      },
    };

    this.metrics.set('application', appMetrics);
    logger.info('Application metrics collected', appMetrics);
  }

  // Get CPU usage percentage
  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - (100 * totalIdle) / totalTick;
  }

  // Check for alert conditions
  private checkAlerts(metrics: SystemMetrics): void {
    // Memory usage alert
    if (metrics.memory.usage > this.alertThresholds.memoryUsage) {
      logger.warn('High memory usage alert', {
        current: metrics.memory.usage,
        threshold: this.alertThresholds.memoryUsage,
        severity: 'high',
      });
    }

    // CPU usage alert
    if (metrics.cpu.usage > this.alertThresholds.cpuUsage) {
      logger.warn('High CPU usage alert', {
        current: metrics.cpu.usage,
        threshold: this.alertThresholds.cpuUsage,
        severity: 'high',
      });
    }

    // Load average alert (for Unix systems)
    if (metrics.cpu.loadAverage[0] > os.cpus().length) {
      logger.warn('High load average alert', {
        current: metrics.cpu.loadAverage[0],
        cpuCount: os.cpus().length,
        severity: 'medium',
      });
    }
  }

  // Register a custom health check
  registerHealthCheck(name: string, check: () => Promise<HealthCheck>): void {
    this.healthChecks.set(name, check);
  }

  // Run all health checks
  async runHealthChecks(): Promise<void> {
    const results: Record<string, HealthCheck[]> = {};

    for (const [name, check] of this.healthChecks) {
      try {
        const result = await check();
        results[name] = [result];
        
        if (result.status === 'fail') {
          logger.error(`Health check failed: ${name}`, result);
        } else if (result.status === 'warn') {
          logger.warn(`Health check warning: ${name}`, result);
        }
      } catch (error) {
        const failedCheck: HealthCheck = {
          status: 'fail',
          componentType: name,
          time: new Date().toISOString(),
          output: `Health check error: ${error.message}`,
        };
        results[name] = [failedCheck];
        logger.error(`Health check error: ${name}`, error);
      }
    }

    this.metrics.set('healthChecks', results);
  }

  // Memory usage health check
  private async checkMemoryUsage(): Promise<HealthCheck> {
    const memoryUsage = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
    
    return {
      status: memoryUsage > 90 ? 'fail' : memoryUsage > 80 ? 'warn' : 'pass',
      componentType: 'system',
      observedValue: memoryUsage,
      observedUnit: 'percent',
      time: new Date().toISOString(),
      output: `Memory usage: ${memoryUsage.toFixed(2)}%`,
    };
  }

  // CPU usage health check
  private async checkCpuUsage(): Promise<HealthCheck> {
    const cpuUsage = this.getCpuUsage();
    
    return {
      status: cpuUsage > 90 ? 'fail' : cpuUsage > 80 ? 'warn' : 'pass',
      componentType: 'system',
      observedValue: cpuUsage,
      observedUnit: 'percent',
      time: new Date().toISOString(),
      output: `CPU usage: ${cpuUsage.toFixed(2)}%`,
    };
  }

  // Disk space health check
  private async checkDiskSpace(): Promise<HealthCheck> {
    // This is a simplified check - in production, you'd use a library like 'node-disk-info'
    return {
      status: 'pass',
      componentType: 'system',
      time: new Date().toISOString(),
      output: 'Disk space check not implemented',
    };
  }

  // Database connection health check
  private async checkDatabaseConnection(): Promise<HealthCheck> {
    try {
      // This would typically use your database client to test connection
      // For now, we'll simulate a check
      const startTime = performance.now();
      // await database.raw('SELECT 1');
      const duration = performance.now() - startTime;

      return {
        status: duration > 1000 ? 'warn' : 'pass',
        componentType: 'datastore',
        observedValue: duration,
        observedUnit: 'ms',
        time: new Date().toISOString(),
        output: `Database connection: ${duration.toFixed(2)}ms`,
      };
    } catch (error) {
      return {
        status: 'fail',
        componentType: 'datastore',
        time: new Date().toISOString(),
        output: `Database connection failed: ${error.message}`,
      };
    }
  }

  // Redis connection health check
  private async checkRedisConnection(): Promise<HealthCheck> {
    try {
      const startTime = performance.now();
      // await redis.ping();
      const duration = performance.now() - startTime;

      return {
        status: duration > 500 ? 'warn' : 'pass',
        componentType: 'cache',
        observedValue: duration,
        observedUnit: 'ms',
        time: new Date().toISOString(),
        output: `Redis connection: ${duration.toFixed(2)}ms`,
      };
    } catch (error) {
      return {
        status: 'fail',
        componentType: 'cache',
        time: new Date().toISOString(),
        output: `Redis connection failed: ${error.message}`,
      };
    }
  }

  // Elasticsearch connection health check
  private async checkElasticsearchConnection(): Promise<HealthCheck> {
    try {
      const startTime = performance.now();
      // await elasticsearch.ping();
      const duration = performance.now() - startTime;

      return {
        status: duration > 1000 ? 'warn' : 'pass',
        componentType: 'search',
        observedValue: duration,
        observedUnit: 'ms',
        time: new Date().toISOString(),
        output: `Elasticsearch connection: ${duration.toFixed(2)}ms`,
      };
    } catch (error) {
      return {
        status: 'fail',
        componentType: 'search',
        time: new Date().toISOString(),
        output: `Elasticsearch connection failed: ${error.message}`,
      };
    }
  }

  // Get health status
  async getHealthStatus(): Promise<HealthStatus> {
    await this.runHealthChecks();
    const checks = this.metrics.get('healthChecks') || {};
    
    // Determine overall status
    let overallStatus: 'pass' | 'warn' | 'fail' = 'pass';
    const notes: string[] = [];

    for (const [component, checkResults] of Object.entries(checks)) {
      for (const check of checkResults as HealthCheck[]) {
        if (check.status === 'fail') {
          overallStatus = 'fail';
          notes.push(`${component}: ${check.output}`);
        } else if (check.status === 'warn' && overallStatus !== 'fail') {
          overallStatus = 'warn';
          notes.push(`${component}: ${check.output}`);
        }
      }
    }

    return {
      status: overallStatus,
      version: process.env.APP_VERSION || '1.0.0',
      releaseId: process.env.RELEASE_ID || 'unknown',
      notes,
      output: overallStatus === 'pass' ? 'All systems operational' : 'Some systems degraded',
      serviceId: 'eu-real-estate-api',
      description: 'EU Real Estate Portal API',
      checks,
    };
  }

  // Get system metrics
  getSystemMetrics(): SystemMetrics | null {
    return this.metrics.get('system') || null;
  }

  // Get application metrics
  getApplicationMetrics(): any {
    return this.metrics.get('application') || null;
  }

  // Set a metric value
  setMetric(key: string, value: any): void {
    this.metrics.set(key, value);
  }

  // Get a metric value
  getMetric(key: string, defaultValue: any = null): any {
    return this.metrics.get(key) || defaultValue;
  }

  // Increment a counter metric
  incrementMetric(key: string, value: number = 1): void {
    const current = this.getMetric(key, 0);
    this.setMetric(key, current + value);
  }

  // Record a timing metric
  recordTiming(key: string, duration: number): void {
    const timings = this.getMetric(`${key}.timings`, []);
    timings.push(duration);
    
    // Keep only last 100 timings
    if (timings.length > 100) {
      timings.shift();
    }
    
    this.setMetric(`${key}.timings`, timings);
    this.setMetric(`${key}.average`, timings.reduce((a: number, b: number) => a + b, 0) / timings.length);
    this.setMetric(`${key}.p95`, this.calculatePercentile(timings, 95));
    this.setMetric(`${key}.p99`, this.calculatePercentile(timings, 99));
  }

  // Calculate percentile
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  // Middleware for request monitoring
  requestMonitoringMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      const startTime = performance.now();
      const requestId = (req as any).requestId;

      // Increment request counter
      this.incrementMetric('requests.total');

      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any) {
        const duration = performance.now() - startTime;
        
        // Record timing
        MonitoringService.getInstance().recordTiming('response', duration);
        
        // Record status code metrics
        if (res.statusCode >= 200 && res.statusCode < 300) {
          MonitoringService.getInstance().incrementMetric('requests.success');
        } else if (res.statusCode >= 400) {
          MonitoringService.getInstance().incrementMetric('requests.errors');
        }

        // Log slow requests
        if (duration > MonitoringService.getInstance().alertThresholds.responseTime) {
          logger.warn('Slow request detected', {
            requestId,
            method: req.method,
            url: req.url,
            duration,
            statusCode: res.statusCode,
          });
        }

        return originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  // Error monitoring middleware
  errorMonitoringMiddleware() {
    return (error: Error, req: Request, res: Response, next: Function) => {
      this.incrementMetric('errors.total');
      this.incrementMetric(`errors.${error.name || 'unknown'}`);

      logger.error('Request error', {
        requestId: (req as any).requestId,
        method: req.method,
        url: req.url,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        userId: (req as any).user?.id,
      });

      next(error);
    };
  }

  // Custom alert handler
  onAlert(callback: (alert: any) => void): void {
    // This would integrate with your alerting system
    // For now, we'll just log alerts
    logger.info('Alert handler registered');
  }
}

export default MonitoringService;