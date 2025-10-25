import { Router } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validateRequest, validateParams } from '../middleware/validation';
import { NotificationService } from '../services/notification.service';
import { NotificationType } from '@eu-real-estate/database';

const router = Router();

// Validation schemas
const sendNotificationSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  type: Joi.string().valid(...Object.values(NotificationType)).required(),
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).max(1000).required(),
  data: Joi.object().optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  scheduledFor: Joi.date().optional(),
  expiresAt: Joi.date().optional(),
});

const bulkNotificationSchema = Joi.object({
  userIds: Joi.array().items(Joi.string().uuid()).min(1).max(1000).required(),
  type: Joi.string().valid(...Object.values(NotificationType)).required(),
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).max(1000).required(),
  data: Joi.object().optional(),
  templateId: Joi.string().uuid().optional(),
  templateVariables: Joi.object().optional(),
});

const notificationFiltersSchema = Joi.object({
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
  unreadOnly: Joi.boolean().optional(),
  type: Joi.string().valid(...Object.values(NotificationType)).optional(),
});

const uuidSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

/**
 * POST /api/notifications/send
 * Send a single notification (admin only)
 */
router.post('/send', authenticate, validateRequest(sendNotificationSchema), asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user!.role !== 'ADMIN') {
    return res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required',
      },
    });
  }

  const notification = await NotificationService.sendNotification(req.body);
  
  res.status(201).json({
    success: true,
    message: 'Notification sent successfully',
    data: { notification },
  });
}));

/**
 * POST /api/notifications/bulk
 * Send bulk notifications (admin only)
 */
router.post('/bulk', authenticate, validateRequest(bulkNotificationSchema), asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user!.role !== 'ADMIN') {
    return res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required',
      },
    });
  }

  const results = await NotificationService.sendBulkNotifications(req.body);
  
  res.status(201).json({
    success: true,
    message: 'Bulk notifications processed',
    data: { results },
  });
}));

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', authenticate, validateRequest(notificationFiltersSchema, 'query'), asyncHandler(async (req, res) => {
  const options = {
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    unreadOnly: req.query.unreadOnly === 'true',
    type: req.query.type as NotificationType | undefined,
  };
  
  const result = await NotificationService.getUserNotifications(req.user!.id, options);
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', authenticate, validateParams(uuidSchema), asyncHandler(async (req, res) => {
  await NotificationService.markAsRead(req.params.id, req.user!.id);
  
  res.json({
    success: true,
    message: 'Notification marked as read',
  });
}));

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', authenticate, asyncHandler(async (req, res) => {
  await NotificationService.markAllAsRead(req.user!.id);
  
  res.json({
    success: true,
    message: 'All notifications marked as read',
  });
}));

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id', authenticate, validateParams(uuidSchema), asyncHandler(async (req, res) => {
  await NotificationService.deleteNotification(req.params.id, req.user!.id);
  
  res.json({
    success: true,
    message: 'Notification deleted successfully',
  });
}));

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', authenticate, asyncHandler(async (req, res) => {
  const result = await NotificationService.getUserNotifications(req.user!.id, { 
    unreadOnly: true, 
    limit: 1 
  });
  
  res.json({
    success: true,
    data: { count: result.unreadCount },
  });
}));

/**
 * POST /api/notifications/property/:propertyId
 * Send property-related notification (internal use)
 */
router.post('/property/:propertyId', authenticate, validateParams({ propertyId: Joi.string().uuid().required() }), asyncHandler(async (req, res) => {
  const { type, data } = req.body;
  
  await NotificationService.sendPropertyNotification(req.params.propertyId, type, data);
  
  res.json({
    success: true,
    message: 'Property notification sent',
  });
}));

/**
 * POST /api/notifications/transaction/:transactionId
 * Send transaction-related notification (internal use)
 */
router.post('/transaction/:transactionId', authenticate, validateParams({ transactionId: Joi.string().uuid().required() }), asyncHandler(async (req, res) => {
  const { type, recipientIds, data } = req.body;
  
  await NotificationService.sendTransactionNotification(
    req.params.transactionId,
    type,
    recipientIds,
    data
  );
  
  res.json({
    success: true,
    message: 'Transaction notification sent',
  });
}));

export { router as notificationRoutes };