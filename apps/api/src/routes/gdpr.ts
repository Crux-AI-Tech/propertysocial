import { Router } from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validateRequest, validateParams } from '../middleware/validation';
import { GDPRService } from '../services/gdpr.service';
import { UserRole } from '@eu-real-estate/database';

const router = Router();

// Validation schemas
const dataExportRequestSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  format: Joi.string().valid('JSON', 'CSV', 'XML').required(),
  includeTransactions: Joi.boolean().optional(),
  includeMessages: Joi.boolean().optional(),
  includeProperties: Joi.boolean().optional(),
  includeSearchHistory: Joi.boolean().optional(),
});

const dataDeletionRequestSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  reason: Joi.string().min(10).max(500).required(),
  retainLegalData: Joi.boolean().optional(),
  deletionDate: Joi.date().optional(),
});

const consentRecordSchema = Joi.object({
  consentType: Joi.string().valid('marketing', 'analytics', 'cookies', 'data_processing', 'third_party_sharing').required(),
  granted: Joi.boolean().required(),
  version: Joi.string().required(),
});

const auditLogFiltersSchema = Joi.object({
  userId: Joi.string().uuid().optional(),
  action: Joi.string().optional(),
  resource: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
});

const uuidSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

/**
 * POST /api/gdpr/data-export
 * Request data export
 */
router.post('/data-export', authenticate, validateRequest(dataExportRequestSchema), asyncHandler(async (req, res) => {
  // Users can only request their own data export, admins can request for any user
  if (req.body.userId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'You can only request export of your own data',
      },
    });
  }

  const exportRequest = await GDPRService.requestDataExport({
    ...req.body,
    requestedBy: req.user!.id,
  });
  
  res.status(201).json({
    success: true,
    message: 'Data export request submitted successfully',
    data: { exportRequest },
  });
}));

/**
 * POST /api/gdpr/data-deletion
 * Request data deletion
 */
router.post('/data-deletion', authenticate, validateRequest(dataDeletionRequestSchema), asyncHandler(async (req, res) => {
  // Users can only request their own data deletion, admins can request for any user
  if (req.body.userId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'You can only request deletion of your own data',
      },
    });
  }

  const deletionRequest = await GDPRService.requestDataDeletion({
    ...req.body,
    requestedBy: req.user!.id,
  });
  
  res.status(201).json({
    success: true,
    message: 'Data deletion request submitted successfully',
    data: { deletionRequest },
  });
}));

/**
 * POST /api/gdpr/consent
 * Record user consent
 */
router.post('/consent', authenticate, validateRequest(consentRecordSchema), asyncHandler(async (req, res) => {
  const consentRecord = await GDPRService.recordConsent({
    userId: req.user!.id,
    consentType: req.body.consentType,
    granted: req.body.granted,
    grantedAt: req.body.granted ? new Date() : undefined,
    revokedAt: !req.body.granted ? new Date() : undefined,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    version: req.body.version,
  });
  
  res.status(201).json({
    success: true,
    message: 'Consent recorded successfully',
    data: { consentRecord },
  });
}));

/**
 * GET /api/gdpr/consent
 * Get user's consent records
 */
router.get('/consent', authenticate, asyncHandler(async (req, res) => {
  const consents = await GDPRService.getUserConsents(req.user!.id);
  
  res.json({
    success: true,
    data: { consents },
  });
}));

/**
 * GET /api/gdpr/consent/:userId
 * Get user's consent records (admin only)
 */
router.get('/consent/:userId', authenticate, authorize(UserRole.ADMIN), validateParams({ userId: Joi.string().uuid().required() }), asyncHandler(async (req, res) => {
  const consents = await GDPRService.getUserConsents(req.params.userId);
  
  res.json({
    success: true,
    data: { consents },
  });
}));

/**
 * GET /api/gdpr/audit-logs
 * Get audit logs (admin only)
 */
router.get('/audit-logs', authenticate, authorize(UserRole.ADMIN), validateRequest(auditLogFiltersSchema, 'query'), asyncHandler(async (req, res) => {
  const filters = {
    ...req.query,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
  };
  
  const result = await GDPRService.getAuditLogs(filters);
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * GET /api/gdpr/audit-logs/user/:userId
 * Get audit logs for specific user (admin only)
 */
router.get('/audit-logs/user/:userId', authenticate, authorize(UserRole.ADMIN), validateParams({ userId: Joi.string().uuid().required() }), asyncHandler(async (req, res) => {
  const result = await GDPRService.getAuditLogs({
    userId: req.params.userId,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  });
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * POST /api/gdpr/process-deletion/:id
 * Process data deletion request (admin only)
 */
router.post('/process-deletion/:id', authenticate, authorize(UserRole.ADMIN), validateParams(uuidSchema), asyncHandler(async (req, res) => {
  await GDPRService.processDataDeletion(req.params.id);
  
  res.json({
    success: true,
    message: 'Data deletion processed successfully',
  });
}));

/**
 * POST /api/gdpr/cleanup-exports
 * Clean up expired export files (admin only)
 */
router.post('/cleanup-exports', authenticate, authorize(UserRole.ADMIN), asyncHandler(async (req, res) => {
  const cleanedCount = await GDPRService.cleanupExpiredExports();
  
  res.json({
    success: true,
    message: `Cleaned up ${cleanedCount} expired exports`,
    data: { cleanedCount },
  });
}));

/**
 * GET /api/gdpr/my-data
 * Get summary of user's data (for transparency)
 */
router.get('/my-data', authenticate, asyncHandler(async (req, res) => {
  // This endpoint provides a summary of what data we have about the user
  // This helps with GDPR transparency requirements
  
  const userId = req.user!.id;
  
  // Get data counts (not the actual data, just counts for transparency)
  const dataSummary = {
    profile: {
      hasProfile: true,
      hasPreferences: true,
      hasVerification: true,
    },
    activity: {
      propertiesOwned: 0, // TODO: Get actual counts
      transactionsCount: 0,
      messagesCount: 0,
      searchHistoryCount: 0,
      favoritesCount: 0,
      notificationsCount: 0,
      reviewsCount: 0,
    },
    consents: [], // Will be populated with actual consent records
    dataRetention: {
      accountCreated: req.user!.createdAt,
      lastLogin: req.user!.lastLoginAt,
      dataRetentionPeriod: '7 years after account closure (as required by EU law)',
    },
  };
  
  // Get actual consent records
  dataSummary.consents = await GDPRService.getUserConsents(userId);
  
  res.json({
    success: true,
    data: { dataSummary },
  });
}));

/**
 * GET /api/gdpr/privacy-policy
 * Get current privacy policy version
 */
router.get('/privacy-policy', asyncHandler(async (req, res) => {
  // This would typically come from a database or CMS
  const privacyPolicy = {
    version: '2.0',
    lastUpdated: '2024-01-01',
    effectiveDate: '2024-01-15',
    language: req.query.lang || 'en',
    content: {
      // This would be the actual privacy policy content
      summary: 'We collect and process personal data in accordance with GDPR and other applicable privacy laws.',
      dataTypes: [
        'Personal identification information',
        'Property preferences and search history',
        'Communication records',
        'Transaction history',
        'Technical data (cookies, IP addresses)',
      ],
      legalBases: [
        'Consent for marketing communications',
        'Contract performance for property transactions',
        'Legitimate interest for service improvement',
        'Legal obligation for financial records',
      ],
      retentionPeriods: {
        accountData: '7 years after account closure',
        transactionRecords: '10 years (legal requirement)',
        marketingData: 'Until consent is withdrawn',
        technicalLogs: '12 months',
      },
      rights: [
        'Right to access your data',
        'Right to rectification',
        'Right to erasure',
        'Right to restrict processing',
        'Right to data portability',
        'Right to object',
        'Right to withdraw consent',
      ],
    },
  };
  
  res.json({
    success: true,
    data: { privacyPolicy },
  });
}));

/**
 * POST /api/gdpr/cookie-consent
 * Record cookie consent
 */
router.post('/cookie-consent', validateRequest(Joi.object({
  necessary: Joi.boolean().required(),
  analytics: Joi.boolean().required(),
  marketing: Joi.boolean().required(),
  preferences: Joi.boolean().required(),
})), asyncHandler(async (req, res) => {
  const { necessary, analytics, marketing, preferences } = req.body;
  const userId = req.user?.id;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');
  
  // Record each type of cookie consent
  const consentTypes = [
    { type: 'cookies', granted: necessary }, // Necessary cookies
    { type: 'analytics', granted: analytics },
    { type: 'marketing', granted: marketing },
  ];
  
  const consentRecords = [];
  
  for (const consent of consentTypes) {
    if (userId) {
      const record = await GDPRService.recordConsent({
        userId,
        consentType: consent.type as any,
        granted: consent.granted,
        grantedAt: consent.granted ? new Date() : undefined,
        revokedAt: !consent.granted ? new Date() : undefined,
        ipAddress,
        userAgent,
        version: '1.0',
      });
      consentRecords.push(record);
    }
  }
  
  res.json({
    success: true,
    message: 'Cookie consent recorded successfully',
    data: { consentRecords },
  });
}));

export { router as gdprRoutes };