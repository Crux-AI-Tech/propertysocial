import { Router, Request, Response } from 'express';
import AnalyticsService from '../services/analytics.service';
import { authMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();
const analytics = AnalyticsService.getInstance();

/**
 * @swagger
 * /analytics/track/event:
 *   post:
 *     summary: Track user event
 *     description: Track a custom user event for analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *               - properties
 *             properties:
 *               event:
 *                 type: string
 *                 description: Event name
 *                 example: property_view
 *               properties:
 *                 type: object
 *                 description: Event properties
 *                 example:
 *                   propertyId: "123e4567-e89b-12d3-a456-426614174000"
 *                   propertyType: "apartment"
 *                   price: 450000
 *               sessionId:
 *                 type: string
 *                 description: Session identifier
 *     responses:
 *       200:
 *         description: Event tracked successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/track/event', authMiddleware, (req: Request, res: Response) => {
  try {
    const { event, properties, sessionId } = req.body;
    const userId = (req as any).user.id;

    if (!event || !properties) {
      return res.status(400).json({
        error: 'Event name and properties are required',
      });
    }

    analytics.trackEvent({
      userId,
      sessionId: sessionId || req.session?.id || 'anonymous',
      event,
      properties,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referrer'),
      page: req.get('Referer'),
    });

    res.json({
      success: true,
      message: 'Event tracked successfully',
    });
  } catch (error) {
    logger.error('Failed to track event', error);
    res.status(500).json({
      error: 'Failed to track event',
    });
  }
});

/**
 * @swagger
 * /analytics/track/pageview:
 *   post:
 *     summary: Track page view
 *     description: Track a page view for analytics
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - page
 *               - sessionId
 *             properties:
 *               page:
 *                 type: string
 *                 description: Page path
 *                 example: /properties/search
 *               title:
 *                 type: string
 *                 description: Page title
 *                 example: Property Search
 *               sessionId:
 *                 type: string
 *                 description: Session identifier
 *               duration:
 *                 type: number
 *                 description: Time spent on page in milliseconds
 *     responses:
 *       200:
 *         description: Page view tracked successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/track/pageview', (req: Request, res: Response) => {
  try {
    const { page, title, sessionId, duration } = req.body;
    const userId = (req as any).user?.id;

    if (!page || !sessionId) {
      return res.status(400).json({
        error: 'Page and sessionId are required',
      });
    }

    analytics.trackPageView({
      userId,
      sessionId,
      page,
      title,
      duration,
      referrer: req.get('Referrer'),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: 'Page view tracked successfully',
    });
  } catch (error) {
    logger.error('Failed to track page view', error);
    res.status(500).json({
      error: 'Failed to track page view',
    });
  }
});

/**
 * @swagger
 * /analytics/track/conversion:
 *   post:
 *     summary: Track conversion event
 *     description: Track a conversion event for analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *               - properties
 *             properties:
 *               event:
 *                 type: string
 *                 description: Conversion event name
 *                 example: offer_submit
 *               value:
 *                 type: number
 *                 description: Conversion value
 *                 example: 450000
 *               currency:
 *                 type: string
 *                 description: Currency code
 *                 example: EUR
 *               properties:
 *                 type: object
 *                 description: Conversion properties
 *               funnel:
 *                 type: string
 *                 description: Funnel name
 *                 example: property_purchase
 *               step:
 *                 type: number
 *                 description: Funnel step number
 *                 example: 3
 *     responses:
 *       200:
 *         description: Conversion tracked successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/track/conversion', authMiddleware, (req: Request, res: Response) => {
  try {
    const { event, value, currency, properties, funnel, step } = req.body;
    const userId = (req as any).user.id;

    if (!event || !properties) {
      return res.status(400).json({
        error: 'Event name and properties are required',
      });
    }

    analytics.trackConversion({
      userId,
      event,
      value,
      currency,
      properties,
      funnel,
      step,
    });

    res.json({
      success: true,
      message: 'Conversion tracked successfully',
    });
  } catch (error) {
    logger.error('Failed to track conversion', error);
    res.status(500).json({
      error: 'Failed to track conversion',
    });
  }
});

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get analytics dashboard data
 *     description: Get comprehensive analytics dashboard data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 24h
 *         description: Time range for analytics data
 *     responses:
 *       200:
 *         description: Analytics dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timeRange:
 *                   type: string
 *                 period:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                       format: date-time
 *                     end:
 *                       type: string
 *                       format: date-time
 *                 overview:
 *                   type: object
 *                   properties:
 *                     uniqueUsers:
 *                       type: number
 *                     totalPageViews:
 *                       type: number
 *                     totalEvents:
 *                       type: number
 *                     totalConversions:
 *                       type: number
 *                     totalRevenue:
 *                       type: number
 *                     conversionRate:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/dashboard', authMiddleware, (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const userRole = (req as any).user.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    const timeRange = req.query.timeRange as '1h' | '24h' | '7d' | '30d' || '24h';
    const dashboardData = analytics.getAnalyticsDashboard(timeRange);

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    logger.error('Failed to get analytics dashboard', error);
    res.status(500).json({
      error: 'Failed to get analytics dashboard',
    });
  }
});

/**
 * @swagger
 * /analytics/realtime:
 *   get:
 *     summary: Get real-time analytics
 *     description: Get real-time analytics data for the last 5 minutes
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time analytics data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 activeUsers:
 *                   type: number
 *                 recentEvents:
 *                   type: number
 *                 recentPageViews:
 *                   type: number
 *                 topPagesNow:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       page:
 *                         type: string
 *                       count:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/realtime', authMiddleware, (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const userRole = (req as any).user.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    const realtimeData = analytics.getRealTimeAnalytics();

    res.json({
      success: true,
      data: realtimeData,
    });
  } catch (error) {
    logger.error('Failed to get real-time analytics', error);
    res.status(500).json({
      error: 'Failed to get real-time analytics',
    });
  }
});

/**
 * @swagger
 * /analytics/user/{userId}/journey:
 *   get:
 *     summary: Get user journey
 *     description: Get detailed user journey and activity timeline
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 7d
 *         description: Time range for user journey data
 *     responses:
 *       200:
 *         description: User journey retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 timeRange:
 *                   type: string
 *                 period:
 *                   type: object
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalEvents:
 *                       type: number
 *                     totalPageViews:
 *                       type: number
 *                     totalConversions:
 *                       type: number
 *                     totalRevenue:
 *                       type: number
 *                 activities:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */
router.get('/user/:userId/journey', authMiddleware, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Users can only view their own journey unless they're admin
    if (userId !== currentUserId && userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    const timeRange = req.query.timeRange as '1h' | '24h' | '7d' | '30d' || '7d';
    const journeyData = analytics.getUserJourney(userId, timeRange);

    res.json({
      success: true,
      data: journeyData,
    });
  } catch (error) {
    logger.error('Failed to get user journey', error);
    res.status(500).json({
      error: 'Failed to get user journey',
    });
  }
});

/**
 * @swagger
 * /analytics/business/metric:
 *   post:
 *     summary: Track business metric
 *     description: Track a custom business metric
 *     tags: [Analytics]
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
 *               - value
 *               - unit
 *             properties:
 *               name:
 *                 type: string
 *                 description: Metric name
 *                 example: average_property_price
 *               value:
 *                 type: number
 *                 description: Metric value
 *                 example: 450000
 *               unit:
 *                 type: string
 *                 description: Metric unit
 *                 example: EUR
 *               tags:
 *                 type: object
 *                 description: Metric tags for filtering
 *                 example:
 *                   city: Berlin
 *                   propertyType: apartment
 *     responses:
 *       200:
 *         description: Business metric tracked successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/business/metric', authMiddleware, (req: Request, res: Response) => {
  try {
    // Check if user has admin role
    const userRole = (req as any).user.role;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    const { name, value, unit, tags } = req.body;

    if (!name || value === undefined || !unit) {
      return res.status(400).json({
        error: 'Name, value, and unit are required',
      });
    }

    analytics.trackBusinessMetric({
      name,
      value,
      unit,
      tags: tags || {},
    });

    res.json({
      success: true,
      message: 'Business metric tracked successfully',
    });
  } catch (error) {
    logger.error('Failed to track business metric', error);
    res.status(500).json({
      error: 'Failed to track business metric',
    });
  }
});

export default router;