import { Router, Request, Response } from 'express';
import MonitoringService from '../services/monitoring.service';
import logger from '../utils/logger';

const router = Router();
const monitoring = MonitoringService.getInstance();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Get comprehensive health status
 *     description: Returns detailed health information about all system components
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [pass, warn, fail]
 *                 version:
 *                   type: string
 *                 releaseId:
 *                   type: string
 *                 notes:
 *                   type: array
 *                   items:
 *                     type: string
 *                 output:
 *                   type: string
 *                 serviceId:
 *                   type: string
 *                 description:
 *                   type: string
 *                 checks:
 *                   type: object
 *       503:
 *         description: System is unhealthy
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthStatus = await monitoring.getHealthStatus();
    
    const statusCode = healthStatus.status === 'fail' ? 503 : 200;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'fail',
      version: process.env.APP_VERSION || '1.0.0',
      releaseId: process.env.RELEASE_ID || 'unknown',
      notes: ['Health check system failure'],
      output: 'Health check system is not responding',
      serviceId: 'eu-real-estate-api',
      description: 'EU Real Estate Portal API',
      checks: {},
    });
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Simple readiness check for load balancers and orchestrators
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ready
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Service is not ready
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const healthStatus = await monitoring.getHealthStatus();
    
    if (healthStatus.status === 'fail') {
      return res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Critical health checks failing',
      });
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: 'Health check system failure',
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Simple liveness check for orchestrators
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: alive
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 */
router.get('/health/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid,
  });
});

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Get system and application metrics
 *     description: Returns detailed metrics about system performance and application usage
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 system:
 *                   type: object
 *                   description: System-level metrics
 *                 application:
 *                   type: object
 *                   description: Application-level metrics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    // This endpoint should be protected in production
    const systemMetrics = monitoring.getSystemMetrics();
    const applicationMetrics = monitoring.getApplicationMetrics();

    res.json({
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      application: applicationMetrics,
    });
  } catch (error) {
    logger.error('Failed to retrieve metrics', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /metrics/prometheus:
 *   get:
 *     summary: Get metrics in Prometheus format
 *     description: Returns metrics in Prometheus exposition format
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Metrics in Prometheus format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/metrics/prometheus', (req: Request, res: Response) => {
  try {
    const systemMetrics = monitoring.getSystemMetrics();
    const applicationMetrics = monitoring.getApplicationMetrics();

    let prometheusMetrics = '';

    if (systemMetrics) {
      prometheusMetrics += `# HELP system_memory_usage_percent System memory usage percentage\\n`;
      prometheusMetrics += `# TYPE system_memory_usage_percent gauge\\n`;
      prometheusMetrics += `system_memory_usage_percent ${systemMetrics.memory.usage}\\n\\n`;

      prometheusMetrics += `# HELP system_cpu_usage_percent System CPU usage percentage\\n`;
      prometheusMetrics += `# TYPE system_cpu_usage_percent gauge\\n`;
      prometheusMetrics += `system_cpu_usage_percent ${systemMetrics.cpu.usage}\\n\\n`;

      prometheusMetrics += `# HELP system_uptime_seconds System uptime in seconds\\n`;
      prometheusMetrics += `# TYPE system_uptime_seconds counter\\n`;
      prometheusMetrics += `system_uptime_seconds ${systemMetrics.uptime}\\n\\n`;
    }

    if (applicationMetrics) {
      prometheusMetrics += `# HELP http_requests_total Total number of HTTP requests\\n`;
      prometheusMetrics += `# TYPE http_requests_total counter\\n`;
      prometheusMetrics += `http_requests_total ${applicationMetrics.requests.total}\\n\\n`;

      prometheusMetrics += `# HELP http_request_duration_seconds HTTP request duration in seconds\\n`;
      prometheusMetrics += `# TYPE http_request_duration_seconds histogram\\n`;
      prometheusMetrics += `http_request_duration_seconds_sum ${applicationMetrics.response.averageTime / 1000}\\n`;
      prometheusMetrics += `http_request_duration_seconds_count ${applicationMetrics.requests.total}\\n\\n`;

      prometheusMetrics += `# HELP database_connections_active Active database connections\\n`;
      prometheusMetrics += `# TYPE database_connections_active gauge\\n`;
      prometheusMetrics += `database_connections_active ${applicationMetrics.database.connections}\\n\\n`;
    }

    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
  } catch (error) {
    logger.error('Failed to generate Prometheus metrics', error);
    res.status(500).send('# Error generating metrics\\n');
  }
});

/**
 * @swagger
 * /debug/info:
 *   get:
 *     summary: Get debug information
 *     description: Returns detailed debug information about the application
 *     tags: [Debug]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Debug information retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/debug/info', (req: Request, res: Response) => {
  // This endpoint should only be available in development or with admin privileges
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Debug endpoint not available in production',
    });
  }

  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0',
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    pid: process.pid,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    environmentVariables: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '[REDACTED]' : undefined,
      REDIS_URL: process.env.REDIS_URL ? '[REDACTED]' : undefined,
      JWT_SECRET: process.env.JWT_SECRET ? '[REDACTED]' : undefined,
    },
    features: {
      monitoring: true,
      logging: true,
      healthChecks: true,
      metrics: true,
    },
  };

  res.json(debugInfo);
});

/**
 * @swagger
 * /debug/logs:
 *   get:
 *     summary: Get recent log entries
 *     description: Returns recent log entries for debugging
 *     tags: [Debug]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [error, warn, info, debug]
 *         description: Filter by log level
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Number of log entries to return
 *     responses:
 *       200:
 *         description: Log entries retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/debug/logs', (req: Request, res: Response) => {
  // This endpoint should only be available in development or with admin privileges
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Debug endpoint not available in production',
    });
  }

  // In a real implementation, you would read from your log files or log aggregation system
  res.json({
    message: 'Log retrieval not implemented in this demo',
    note: 'In production, this would return recent log entries from your logging system',
    timestamp: new Date().toISOString(),
  });
});

export default router;