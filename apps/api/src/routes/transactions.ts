import { Router } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validateRequest, validateParams } from '../middleware/validation';
import { TransactionService } from '../services/transaction.service';
import { TransactionStatus, TransactionType, OfferStatus, DocumentType } from '@eu-real-estate/database';

const router = Router();

// Validation schemas
const createTransactionSchema = Joi.object({
  propertyId: Joi.string().uuid().required(),
  sellerId: Joi.string().uuid().required(),
  buyerId: Joi.string().uuid().optional(),
  agentId: Joi.string().uuid().optional(),
  type: Joi.string().valid(...Object.values(TransactionType)).required(),
  offerAmount: Joi.number().min(0).optional(),
  currency: Joi.string().length(3).optional(),
  notes: Joi.string().max(2000).optional(),
  terms: Joi.object().optional(),
  expectedCompletion: Joi.date().optional(),
});

const updateTransactionSchema = Joi.object({
  status: Joi.string().valid(...Object.values(TransactionStatus)).optional(),
  finalAmount: Joi.number().min(0).optional(),
  commission: Joi.number().min(0).optional(),
  commissionRate: Joi.number().min(0).max(100).optional(),
  notes: Joi.string().max(2000).optional(),
  terms: Joi.object().optional(),
  expectedCompletion: Joi.date().optional(),
});

const createOfferSchema = Joi.object({
  transactionId: Joi.string().uuid().required(),
  offererId: Joi.string().uuid().required(),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().length(3).optional(),
  message: Joi.string().max(1000).optional(),
  conditions: Joi.object().optional(),
  validUntil: Joi.date().optional(),
});

const respondToOfferSchema = Joi.object({
  status: Joi.string().valid(...Object.values(OfferStatus)).required(),
  counterOffer: Joi.object({
    amount: Joi.number().min(0).required(),
    currency: Joi.string().length(3).optional(),
    message: Joi.string().max(1000).optional(),
    conditions: Joi.object().optional(),
    validUntil: Joi.date().optional(),
  }).optional(),
});

const uploadDocumentSchema = Joi.object({
  type: Joi.string().valid(...Object.values(DocumentType)).required(),
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional(),
  fileName: Joi.string().min(1).max(255).required(),
  fileUrl: Joi.string().uri().required(),
  fileSize: Joi.number().min(0).optional(),
  mimeType: Joi.string().optional(),
  requiresSignature: Joi.boolean().optional(),
  expiresAt: Joi.date().optional(),
});

const transactionFiltersSchema = Joi.object({
  status: Joi.array().items(Joi.string().valid(...Object.values(TransactionStatus))).optional(),
  type: Joi.string().valid(...Object.values(TransactionType)).optional(),
  propertyId: Joi.string().uuid().optional(),
  buyerId: Joi.string().uuid().optional(),
  sellerId: Joi.string().uuid().optional(),
  agentId: Joi.string().uuid().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'offerAmount', 'finalAmount', 'status').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

const uuidSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

/**
 * POST /api/transactions
 * Create a new transaction
 */
router.post('/', authenticate, validateRequest(createTransactionSchema), asyncHandler(async (req, res) => {
  const transaction = await TransactionService.createTransaction(req.body, req.user!.id);
  
  res.status(201).json({
    success: true,
    message: 'Transaction created successfully',
    data: { transaction },
  });
}));

/**
 * GET /api/transactions
 * Get transactions with filters
 */
router.get('/', authenticate, validateRequest(transactionFiltersSchema, 'query'), asyncHandler(async (req, res) => {
  const filters = {
    ...req.query,
    status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) : undefined,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
  };
  
  const result = await TransactionService.getTransactions(filters, req.user!.id);
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * GET /api/transactions/:id
 * Get transaction by ID
 */
router.get('/:id', authenticate, validateParams(uuidSchema), asyncHandler(async (req, res) => {
  const transaction = await TransactionService.getTransactionById(req.params.id, req.user!.id);
  
  res.json({
    success: true,
    data: { transaction },
  });
}));

/**
 * PUT /api/transactions/:id
 * Update transaction
 */
router.put('/:id', authenticate, validateParams(uuidSchema), validateRequest(updateTransactionSchema), asyncHandler(async (req, res) => {
  const transaction = await TransactionService.updateTransaction(req.params.id, req.body, req.user!.id);
  
  res.json({
    success: true,
    message: 'Transaction updated successfully',
    data: { transaction },
  });
}));

/**
 * POST /api/transactions/offers
 * Create an offer
 */
router.post('/offers', authenticate, validateRequest(createOfferSchema), asyncHandler(async (req, res) => {
  const offer = await TransactionService.createOffer(req.body, req.user!.id);
  
  res.status(201).json({
    success: true,
    message: 'Offer created successfully',
    data: { offer },
  });
}));

/**
 * PUT /api/transactions/offers/:id/respond
 * Respond to an offer
 */
router.put('/offers/:id/respond', authenticate, validateParams(uuidSchema), validateRequest(respondToOfferSchema), asyncHandler(async (req, res) => {
  const { status, counterOffer } = req.body;
  
  const result = await TransactionService.respondToOffer(
    req.params.id,
    status,
    req.user!.id,
    counterOffer
  );
  
  res.json({
    success: true,
    message: 'Offer response submitted successfully',
    data: result,
  });
}));

/**
 * POST /api/transactions/:id/documents
 * Upload transaction document
 */
router.post('/:id/documents', authenticate, validateParams(uuidSchema), validateRequest(uploadDocumentSchema), asyncHandler(async (req, res) => {
  const document = await TransactionService.uploadDocument(
    req.params.id,
    req.user!.id,
    req.body
  );
  
  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: { document },
  });
}));

/**
 * PUT /api/transactions/milestones/:id/complete
 * Complete a milestone
 */
router.put('/milestones/:id/complete', authenticate, validateParams(uuidSchema), asyncHandler(async (req, res) => {
  const milestone = await TransactionService.completeMilestone(req.params.id, req.user!.id);
  
  res.json({
    success: true,
    message: 'Milestone completed successfully',
    data: { milestone },
  });
}));

/**
 * GET /api/transactions/:id/timeline
 * Get transaction timeline
 */
router.get('/:id/timeline', authenticate, validateParams(uuidSchema), asyncHandler(async (req, res) => {
  // This would be implemented to show a chronological timeline of all transaction events
  // For now, we'll return the transaction with its status history and milestones
  const transaction = await TransactionService.getTransactionById(req.params.id, req.user!.id);
  
  // Create timeline from status history and milestones
  const timeline = [
    ...transaction.statusHistory.map((status: any) => ({
      type: 'status_change',
      timestamp: status.createdAt,
      title: `Status changed to ${status.newStatus}`,
      description: status.reason || status.notes,
      user: status.changedBy,
    })),
    ...transaction.milestones
      .filter((milestone: any) => milestone.completedAt)
      .map((milestone: any) => ({
        type: 'milestone_completed',
        timestamp: milestone.completedAt,
        title: milestone.title,
        description: milestone.description,
        user: milestone.completedBy,
      })),
    ...transaction.offers.map((offer: any) => ({
      type: 'offer_created',
      timestamp: offer.createdAt,
      title: `Offer of ${offer.amount} ${offer.currency}`,
      description: offer.message,
      user: offer.offerer,
      status: offer.status,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  res.json({
    success: true,
    data: { timeline },
  });
}));

export { router as transactionRoutes };