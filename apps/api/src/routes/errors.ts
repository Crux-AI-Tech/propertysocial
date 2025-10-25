import { Router, Request, Response } from 'express';
import ErrorTrackingService from '../services/error-tracking.service';
import { authMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();
const errorTracking = ErrorTrackingService.getInstance();

/**
 * @swagger
 * /errors:
 *   get:
 *     summary: Get error reports
 *     description: Retrieve error reports with filtering and pagination
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by error level
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [application, security, performance, business]
 *         description: Filter by error type
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: boolean
 *         description: Filter by resolution status
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 24h
 *         description: Time range for errors
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of errors to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of errors to skip
 *     responses:
 *       200:
 *         description: Error reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     errors:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ErrorReport'
 *                     total:
 *                       type: integer
 *                     filters:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/', authMiddleware, (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const userRole = (req as any).user.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    const filters = {
      level: req.query.level as string,
      type: req.query.type as string,
      resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined,
      timeRange: req.query.timeRange as string || '24h',
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0,
    };

    const errors = errorTracking.getErrors(filters);

    res.json({
      success: true,
      data: {
        errors,
        total: errors.length,
        filters,
      },
    });
  } catch (error) {
    logger.error('Failed to get error reports', error);
    res.status(500).json({
      error: 'Failed to get error reports',
    });
  }
});

/**
 * @swagger
 * /errors/{errorId}:
 *   get:
 *     summary: Get error report by ID
 *     description: Retrieve detailed error report by ID
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: errorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Error ID
 *     responses:
 *       200:
 *         description: Error report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     error:
 *                       $ref: '#/components/schemas/ErrorReport'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Error not found
 */
router.get('/:errorId', authMiddleware, (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const userRole = (req as any).user.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    const { errorId } = req.params;
    const error = errorTracking.getError(errorId);

    if (!error) {
      return res.status(404).json({
        error: 'Error not found',
      });
    }

    res.json({
      success: true,
      data: {
        error,
      },
    });
  } catch (error) {
    logger.error('Failed to get error report', error);
    res.status(500).json({
      error: 'Failed to get error report',
    });
  }
});

/**
 * @swagger
 * /errors/{errorId}/resolve:
 *   post:
 *     summary: Resolve error
 *     description: Mark an error as resolved
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: errorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Error ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignee:
 *                 type: string
 *                 description: Email of the person resolving the error
 *     responses:
 *       200:
 *         description: Error resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Error not found
 */
router.post('/:errorId/resolve', authMiddleware, (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const userRole = (req as any).user.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    const { errorId } = req.params;
    const { assignee } = req.body;
    const currentUser = (req as any).user;

    const resolved = errorTracking.resolveError(errorId, assignee || currentUser.email);

    if (!resolved) {
      return res.status(404).json({
        error: 'Error not found',
      });
    }

    res.json({
      success: true,
      message: 'Error resolved successfully',
    });
  } catch (error) {
    logger.error('Failed to resolve error', error);
    res.status(500).json({
      error: 'Failed to resolve error',
    });
  }
});

/**
 * @swagger
 * /errors/statistics:
 *   get:
 *     summary: Get error statistics
 *     description: Get comprehensive error statistics and trends
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 24h
 *         description: Time range for statistics
 *     responses:
 *       200:
 *         description: Error statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     timeRange:
 *                       type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalErrors:
 *                           type: number
 *                         uniqueErrors:
 *                           type: number
 *                         resolvedErrors:
 *                           type: number
 *                         errorRate:
 *                           type: number
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         byLevel:
 *                           type: object
 *                         byType:
 *                           type: object
 *                     topErrors:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/statistics', authMiddleware, (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const userRole = (req as any).user.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    const timeRange = req.query.timeRange as string || '24h';
    const statistics = errorTracking.getErrorStatistics(timeRange);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    logger.error('Failed to get error statistics', error);
    res.status(500).json({
      error: 'Failed to get error statistics',
    });
  }
});

/**
 * @swagger
 * /errors/track:
 *   post:
 *     summary: Track custom error
 *     description: Manually track a custom error or incident
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - type
 *             properties:
 *               message:
 *                 type: string
 *                 description: Error message
 *                 example: Custom application error
 *               type:
 *                 type: string
 *                 enum: [application, security, performance, business]
 *                 description: Error type
 *               level:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 description: Error severity level
 *                 default: medium
 *               context:
 *                 type: object
 *                 description: Additional context information
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       200:
 *         description: Error tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     errorId:
 *                       type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/track', authMiddleware, (req: Request, res: Response) => {
  try {
    const { message, type, level = 'medium', context = {}, metadata = {} } = req.body;
    const currentUser = (req as any).user;

    if (!message || !type) {
      return res.status(400).json({
        error: 'Message and type are required',
      });
    }

    // Create custom error
    const error = new Error(message);
    error.name = `Custom${type.charAt(0).toUpperCase() + type.slice(1)}Error`;

    const errorContext = {
      userId: currentUser.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      ...context,
    };

    const errorMetadata = {
      level,
      type,
      reportedBy: currentUser.email,
      ...metadata,
    };

    const errorId = errorTracking.trackError(error, errorContext, errorMetadata);

    res.json({
      success: true,
      data: {
        errorId,
      },
    });
  } catch (error) {
    logger.error('Failed to track custom error', error);
    res.status(500).json({
      error: 'Failed to track custom error',
    });
  }
});

/**
 * @swagger
 * /errors/alerts/rules:
 *   get:
 *     summary: Get alert rules
 *     description: Retrieve all error alert rules
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alert rules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     rules:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AlertRule'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/alerts/rules', authMiddleware, (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const userRole = (req as any).user.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    const rules = errorTracking.getAlertRules();

    res.json({
      success: true,
      data: {
        rules,
      },
    });
  } catch (error) {
    logger.error('Failed to get alert rules', error);
    res.status(500).json({
      error: 'Failed to get alert rules',
    });
  }
});

/**
 * @swagger
 * /errors/alerts/rules:
 *   post:
 *     summary: Create alert rule
 *     description: Create a new error alert rule
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - conditions
 *               - actions
 *               - cooldown
 *             properties:
 *               name:
 *                 type: string
 *                 description: Rule name
 *               description:
 *                 type: string
 *                 description: Rule description
 *               enabled:
 *                 type: boolean
 *                 default: true
 *               conditions:
 *                 type: object
 *                 properties:
 *                   errorRate:
 *                     type: number
 *                   errorCount:
 *                     type: number
 *                   errorType:
 *                     type: string
 *                   level:
 *                     type: string
 *                   timeWindow:
 *                     type: number
 *               actions:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: array
 *                     items:
 *                       type: string
 *                   slack:
 *                     type: string
 *                   webhook:
 *                     type: string
 *                   pagerDuty:
 *                     type: boolean
 *               cooldown:
 *                 type: number
 *                 description: Cooldown period in minutes
 *     responses:
 *       201:
 *         description: Alert rule created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/alerts/rules', authMiddleware, (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const userRole = (req as any).user.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    const { name, description, enabled = true, conditions, actions, cooldown } = req.body;

    if (!name || !description || !conditions || !actions || cooldown === undefined) {
      return res.status(400).json({
        error: 'Name, description, conditions, actions, and cooldown are required',
      });
    }

    const ruleId = errorTracking.addAlertRule({
      name,
      description,
      enabled,
      conditions,
      actions,
      cooldown,
    });

    res.status(201).json({
      success: true,
      data: {
        ruleId,
      },
    });
  } catch (error) {
    logger.error('Failed to create alert rule', error);
    res.status(500).json({
      error: 'Failed to create alert rule',
    });
  }
});

/**
 * @swagger
 * /errors/alerts/rules/{ruleId}:
 *   put:
 *     summary: Update alert rule
 *     description: Update an existing alert rule
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert rule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               conditions:
 *                 type: object
 *               actions:
 *                 type: object
 *               cooldown:
 *                 type: number
 *     responses:
 *       200:
 *         description: Alert rule updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Alert rule not found
 */
router.put('/alerts/rules/:ruleId', authMiddleware, (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const userRole = (req as any).user.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    const { ruleId } = req.params;
    const updates = req.body;

    const updated = errorTracking.updateAlertRule(ruleId, updates);

    if (!updated) {
      return res.status(404).json({
        error: 'Alert rule not found',
      });
    }

    res.json({
      success: true,
      message: 'Alert rule updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update alert rule', error);
    res.status(500).json({
      error: 'Failed to update alert rule',
    });
  }
});

/**
 * @swagger
 * /errors/alerts/rules/{ruleId}:
 *   delete:
 *     summary: Delete alert rule
 *     description: Delete an alert rule
 *     tags: [Error Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert rule ID
 *     responses:
 *       200:
 *         description: Alert rule deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Alert rule not found
 */
router.delete('/alerts/rules/:ruleId', authMiddleware, (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const userRole = (req as any).user.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    const { ruleId } = req.params;

    const deleted = errorTracking.deleteAlertRule(ruleId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Alert rule not found',
      });
    }

    res.json({
      success: true,
      message: 'Alert rule deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete alert rule', error);
    res.status(500).json({
      error: 'Failed to delete alert rule',
    });
  }
});

export default router;