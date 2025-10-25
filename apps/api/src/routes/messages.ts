import { Router } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validateRequest, validateParams } from '../middleware/validation';
import { MessagingService } from '../services/messaging.service';

const router = Router();

// Validation schemas
const sendMessageSchema = Joi.object({
  recipientId: Joi.string().uuid().optional(),
  transactionId: Joi.string().uuid().optional(),
  subject: Joi.string().max(200).optional(),
  content: Joi.string().min(1).max(5000).required(),
  isInternal: Joi.boolean().optional(),
  attachments: Joi.array().items(
    Joi.object({
      fileName: Joi.string().required(),
      fileUrl: Joi.string().uri().required(),
      fileSize: Joi.number().min(0).optional(),
      mimeType: Joi.string().optional(),
    })
  ).optional(),
}).custom((value, helpers) => {
  // At least one of recipientId or transactionId must be provided
  if (!value.recipientId && !value.transactionId) {
    return helpers.error('any.custom', {
      message: 'Either recipientId or transactionId must be provided',
    });
  }
  return value;
});

const messageFiltersSchema = Joi.object({
  transactionId: Joi.string().uuid().optional(),
  senderId: Joi.string().uuid().optional(),
  recipientId: Joi.string().uuid().optional(),
  isInternal: Joi.boolean().optional(),
  unreadOnly: Joi.boolean().optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
  sortBy: Joi.string().valid('createdAt', 'updatedAt').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

const uuidSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

/**
 * POST /api/messages
 * Send a message
 */
router.post('/', authenticate, validateRequest(sendMessageSchema), asyncHandler(async (req, res) => {
  const messageData = {
    ...req.body,
    senderId: req.user!.id,
  };
  
  const message = await MessagingService.sendMessage(messageData);
  
  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: { message },
  });
}));

/**
 * GET /api/messages
 * Get messages with filters
 */
router.get('/', authenticate, validateRequest(messageFiltersSchema, 'query'), asyncHandler(async (req, res) => {
  const filters = {
    ...req.query,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    unreadOnly: req.query.unreadOnly === 'true',
    isInternal: req.query.isInternal ? req.query.isInternal === 'true' : undefined,
  };
  
  const result = await MessagingService.getMessages(filters, req.user!.id);
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * GET /api/messages/conversations
 * Get conversation summaries
 */
router.get('/conversations', authenticate, asyncHandler(async (req, res) => {
  const conversations = await MessagingService.getConversations(req.user!.id);
  
  res.json({
    success: true,
    data: { conversations },
  });
}));

/**
 * PUT /api/messages/:id/read
 * Mark message as read
 */
router.put('/:id/read', authenticate, validateParams(uuidSchema), asyncHandler(async (req, res) => {
  await MessagingService.markMessageAsRead(req.params.id, req.user!.id);
  
  res.json({
    success: true,
    message: 'Message marked as read',
  });
}));

/**
 * PUT /api/messages/conversations/:transactionId/read
 * Mark all messages in a conversation as read
 */
router.put('/conversations/:transactionId/read', authenticate, validateParams({ transactionId: Joi.string().uuid().required() }), asyncHandler(async (req, res) => {
  await MessagingService.markConversationAsRead(req.params.transactionId, req.user!.id);
  
  res.json({
    success: true,
    message: 'Conversation marked as read',
  });
}));

/**
 * DELETE /api/messages/:id
 * Delete message
 */
router.delete('/:id', authenticate, validateParams(uuidSchema), asyncHandler(async (req, res) => {
  await MessagingService.deleteMessage(req.params.id, req.user!.id);
  
  res.json({
    success: true,
    message: 'Message deleted successfully',
  });
}));

/**
 * GET /api/messages/online-users
 * Get list of online users
 */
router.get('/online-users', authenticate, asyncHandler(async (req, res) => {
  const onlineUsers = MessagingService.getOnlineUsers();
  
  res.json({
    success: true,
    data: { onlineUsers },
  });
}));

/**
 * GET /api/messages/user/:userId/online
 * Check if specific user is online
 */
router.get('/user/:userId/online', authenticate, validateParams({ userId: Joi.string().uuid().required() }), asyncHandler(async (req, res) => {
  const isOnline = MessagingService.isUserOnline(req.params.userId);
  
  res.json({
    success: true,
    data: { isOnline },
  });
}));

/**
 * POST /api/messages/system/:transactionId
 * Send system message (internal use)
 */
router.post('/system/:transactionId', authenticate, validateParams({ transactionId: Joi.string().uuid().required() }), asyncHandler(async (req, res) => {
  const { content, data } = req.body;
  
  await MessagingService.sendSystemMessage(req.params.transactionId, content, data);
  
  res.json({
    success: true,
    message: 'System message sent',
  });
}));

export { router as messageRoutes };