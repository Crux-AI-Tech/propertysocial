import { Router } from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validateRequest } from '../middleware/validation';
import { ThirdPartyIntegrationService } from '../services/third-party-integration.service';
import { UserRole } from '@eu-real-estate/database';
import { CacheService } from '../services/cache.service';

const router = Router();

// Validation schemas
const propertyValuationSchema = Joi.object({
  address: Joi.string().required(),
  propertyType: Joi.string().valid('APARTMENT', 'HOUSE', 'COMMERCIAL', 'LAND').required(),
  size: Joi.number().positive().required(),
  country: Joi.string().length(2).required(),
});

const mortgageQuoteSchema = Joi.object({
  propertyValue: Joi.number().positive().required(),
  downPayment: Joi.number().positive().required(),
  income: Joi.number().positive().required(),
  country: Joi.string().length(2).required(),
  currency: Joi.string().length(3).default('EUR'),
});

const legalServicesSchema = Joi.object({
  serviceType: Joi.string().valid('conveyancing', 'property_law', 'contract_review').required(),
  country: Joi.string().length(2).required(),
  language: Joi.string().length(2).default('en'),
});

const paymentMethodsSchema = Joi.object({
  country: Joi.string().length(2).required(),
  currency: Joi.string().length(3).default('EUR'),
});

const geocodeSchema = Joi.object({
  address: Joi.string().required(),
  country: Joi.string().length(2).optional(),
});

const emailSchema = Joi.object({
  to: Joi.string().email().required(),
  templateId: Joi.string().required(),
  data: Joi.object().required(),
  language: Joi.string().length(2).default('en'),
});

const smsSchema = Joi.object({
  phoneNumber: Joi.string().required(),
  message: Joi.string().max(160).required(),
  country: Joi.string().length(2).required(),
});

/**
 * POST /api/integrations/property/valuation
 * Get property valuation from multiple sources
 */
router.post('/property/valuation', 
  authenticate, 
  validateRequest(propertyValuationSchema), 
  CacheService.middleware(1800), // 30 minutes cache
  asyncHandler(async (req, res) => {
    const { address, propertyType, size, country } = req.body;
    
    const valuations = await ThirdPartyIntegrationService.getPropertyValuation(
      address, propertyType, size, country
    );
    
    res.json({
      success: true,
      data: {
        valuations,
        count: valuations.length,
        averageValue: valuations.length > 0 
          ? valuations.reduce((sum, v) => sum + v.estimatedValue, 0) / valuations.length
          : null,
      },
    });
  })
);

/**
 * POST /api/integrations/mortgage/quotes
 * Get mortgage quotes from brokers
 */
router.post('/mortgage/quotes', 
  authenticate, 
  validateRequest(mortgageQuoteSchema),
  CacheService.middleware(900), // 15 minutes cache
  asyncHandler(async (req, res) => {
    const { propertyValue, downPayment, income, country, currency } = req.body;
    
    const quotes = await ThirdPartyIntegrationService.getMortgageQuotes(
      propertyValue, downPayment, income, country, currency
    );
    
    res.json({
      success: true,
      data: {
        quotes,
        count: quotes.length,
        bestRate: quotes.length > 0 ? Math.min(...quotes.map(q => q.interestRate)) : null,
      },
    });
  })
);

/**
 * GET /api/integrations/legal/services
 * Get legal service providers
 */
router.get('/legal/services', 
  authenticate, 
  validateRequest(legalServicesSchema, 'query'),
  CacheService.middleware(3600), // 1 hour cache
  asyncHandler(async (req, res) => {
    const { serviceType, country, language } = req.query as any;
    
    const services = await ThirdPartyIntegrationService.getLegalServices(
      serviceType, country, language
    );
    
    res.json({
      success: true,
      data: {
        services,
        count: services.length,
      },
    });
  })
);

/**
 * GET /api/integrations/payment/methods
 * Get available payment methods for country
 */
router.get('/payment/methods', 
  authenticate, 
  validateRequest(paymentMethodsSchema, 'query'),
  CacheService.middleware(7200), // 2 hours cache
  asyncHandler(async (req, res) => {
    const { country, currency } = req.query as any;
    
    const methods = await ThirdPartyIntegrationService.getPaymentMethods(country, currency);
    
    res.json({
      success: true,
      data: {
        methods,
        count: methods.length,
      },
    });
  })
);

/**
 * POST /api/integrations/geocode
 * Geocode address using Google Maps
 */
router.post('/geocode', 
  authenticate, 
  validateRequest(geocodeSchema),
  CacheService.middleware(86400), // 24 hours cache
  asyncHandler(async (req, res) => {
    const { address, country } = req.body;
    
    const result = await ThirdPartyIntegrationService.geocodeAddress(address, country);
    
    if (!result) {
      return res.status(404).json({
        error: {
          code: 'GEOCODING_FAILED',
          message: 'Could not geocode the provided address',
        },
      });
    }
    
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/integrations/email/send
 * Send multilingual email
 */
router.post('/email/send', 
  authenticate, 
  authorize(UserRole.AGENT, UserRole.ADMIN),
  validateRequest(emailSchema),
  asyncHandler(async (req, res) => {
    const { to, templateId, data, language } = req.body;
    
    const success = await ThirdPartyIntegrationService.sendEmail(to, templateId, data, language);
    
    if (!success) {
      return res.status(500).json({
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send email',
        },
      });
    }
    
    res.json({
      success: true,
      message: 'Email sent successfully',
    });
  })
);

/**
 * POST /api/integrations/sms/send
 * Send SMS with country-specific formatting
 */
router.post('/sms/send', 
  authenticate, 
  authorize(UserRole.AGENT, UserRole.ADMIN),
  validateRequest(smsSchema),
  asyncHandler(async (req, res) => {
    const { phoneNumber, message, country } = req.body;
    
    const success = await ThirdPartyIntegrationService.sendSMS(phoneNumber, message, country);
    
    if (!success) {
      return res.status(500).json({
        error: {
          code: 'SMS_SEND_FAILED',
          message: 'Failed to send SMS',
        },
      });
    }
    
    res.json({
      success: true,
      message: 'SMS sent successfully',
    });
  })
);

/**
 * GET /api/integrations/health
 * Get integration health status (admin only)
 */
router.get('/health', 
  authenticate, 
  authorize(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const health = await ThirdPartyIntegrationService.getIntegrationHealth();
    
    // Calculate overall health
    const statuses = Object.values(health).map(h => h.status);
    const healthyCount = statuses.filter(s => s === 'healthy').length;
    const totalCount = statuses.length;
    
    const overallStatus = healthyCount === totalCount ? 'healthy' : 
                         healthyCount > totalCount / 2 ? 'degraded' : 'down';
    
    res.json({
      success: true,
      data: {
        overall: {
          status: overallStatus,
          healthy: healthyCount,
          total: totalCount,
          percentage: Math.round((healthyCount / totalCount) * 100),
        },
        integrations: health,
      },
    });
  })
);

/**
 * GET /api/integrations/status
 * Get integration configuration status (admin only)
 */
router.get('/status', 
  authenticate, 
  authorize(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const integrations = [
      { name: 'European Property Data', enabled: !!process.env.EPD_API_KEY },
      { name: 'Property Radar', enabled: !!process.env.PROPERTY_RADAR_API_KEY },
      { name: 'EU Mortgage Broker', enabled: !!process.env.EU_MORTGAGE_API_KEY },
      { name: 'Mortgage Finder', enabled: !!process.env.MORTGAGE_FINDER_API_KEY },
      { name: 'EU Legal Services', enabled: !!process.env.EU_LEGAL_API_KEY },
      { name: 'Stripe', enabled: !!process.env.STRIPE_SECRET_KEY },
      { name: 'Adyen', enabled: !!process.env.ADYEN_API_KEY },
      { name: 'Google Maps', enabled: !!process.env.GOOGLE_MAPS_API_KEY },
      { name: 'SendGrid', enabled: !!process.env.SENDGRID_API_KEY },
      { name: 'Twilio', enabled: !!process.env.TWILIO_AUTH_TOKEN },
    ];
    
    const enabledCount = integrations.filter(i => i.enabled).length;
    
    res.json({
      success: true,
      data: {
        summary: {
          total: integrations.length,
          enabled: enabledCount,
          disabled: integrations.length - enabledCount,
          percentage: Math.round((enabledCount / integrations.length) * 100),
        },
        integrations,
      },
    });
  })
);

export { router as integrationRoutes };