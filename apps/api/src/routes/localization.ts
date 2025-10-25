import { Router } from 'express';
import Joi from 'joi';
import { authenticate, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validateRequest, validateParams } from '../middleware/validation';
import { LocalizationService } from '../services/localization.service';

const router = Router();

// Validation schemas
const languageSchema = Joi.object({
  language: Joi.string().min(2).max(5).required(),
});

const localizationContextSchema = Joi.object({
  language: Joi.string().min(2).max(5).optional(),
  country: Joi.string().length(2).optional(),
  acceptLanguage: Joi.string().optional(),
});

const formatCurrencySchema = Joi.object({
  amount: Joi.number().required(),
  country: Joi.string().length(2).required(),
  language: Joi.string().min(2).max(5).optional(),
});

const formatDateSchema = Joi.object({
  date: Joi.date().required(),
  country: Joi.string().length(2).required(),
  language: Joi.string().min(2).max(5).optional(),
  options: Joi.object().optional(),
});

const formatNumberSchema = Joi.object({
  number: Joi.number().required(),
  country: Joi.string().length(2).required(),
  language: Joi.string().min(2).max(5).optional(),
  options: Joi.object().optional(),
});

const documentTemplateSchema = Joi.object({
  documentType: Joi.string().required(),
  country: Joi.string().length(2).required(),
  language: Joi.string().min(2).max(5).required(),
});

const emailTemplateSchema = Joi.object({
  templateType: Joi.string().required(),
  language: Joi.string().min(2).max(5).required(),
});

/**
 * GET /api/localization/config
 * Get localization configuration
 */
router.get('/config', asyncHandler(async (req, res) => {
  const config = LocalizationService.getConfig();
  
  res.json({
    success: true,
    data: { config },
  });
}));

/**
 * POST /api/localization/detect-language
 * Detect user language
 */
router.post('/detect-language', validateRequest(localizationContextSchema), asyncHandler(async (req, res) => {
  const { language: userPreference, country, acceptLanguage } = req.body;
  const detectedLanguage = LocalizationService.detectLanguage(
    acceptLanguage || req.get('Accept-Language'),
    userPreference,
    country
  );
  
  res.json({
    success: true,
    data: { language: detectedLanguage },
  });
}));

/**
 * PUT /api/localization/language
 * Update user language preference
 */
router.put('/language', authenticate, validateRequest(languageSchema), asyncHandler(async (req, res) => {
  await LocalizationService.updateUserLanguage(req.user!.id, req.body.language);
  
  res.json({
    success: true,
    message: 'Language preference updated successfully',
  });
}));

/**
 * GET /api/localization/context
 * Get user's localization context
 */
router.get('/context', authenticate, asyncHandler(async (req, res) => {
  const context = await LocalizationService.getUserLocalizationContext(req.user!.id);
  
  res.json({
    success: true,
    data: { context },
  });
}));

/**
 * POST /api/localization/format/currency
 * Format currency for country
 */
router.post('/format/currency', validateRequest(formatCurrencySchema), asyncHandler(async (req, res) => {
  const { amount, country, language } = req.body;
  const formatted = LocalizationService.formatCurrency(amount, country, language);
  
  res.json({
    success: true,
    data: { formatted },
  });
}));

/**
 * POST /api/localization/format/date
 * Format date for country
 */
router.post('/format/date', validateRequest(formatDateSchema), asyncHandler(async (req, res) => {
  const { date, country, language, options } = req.body;
  const formatted = LocalizationService.formatDate(new Date(date), country, language, options);
  
  res.json({
    success: true,
    data: { formatted },
  });
}));

/**
 * POST /api/localization/format/number
 * Format number for country
 */
router.post('/format/number', validateRequest(formatNumberSchema), asyncHandler(async (req, res) => {
  const { number, country, language, options } = req.body;
  const formatted = LocalizationService.formatNumber(number, country, language, options);
  
  res.json({
    success: true,
    data: { formatted },
  });
}));

/**
 * GET /api/localization/property-types/:language
 * Get localized property types
 */
router.get('/property-types/:language', validateParams(languageSchema), asyncHandler(async (req, res) => {
  const propertyTypes = await LocalizationService.getLocalizedPropertyTypes(req.params.language);
  
  res.json({
    success: true,
    data: { propertyTypes },
  });
}));

/**
 * GET /api/localization/amenities/:language
 * Get localized amenities
 */
router.get('/amenities/:language', validateParams(languageSchema), asyncHandler(async (req, res) => {
  const amenities = await LocalizationService.getLocalizedAmenities(req.params.language);
  
  res.json({
    success: true,
    data: { amenities },
  });
}));

/**
 * POST /api/localization/legal-document
 * Get legal document template
 */
router.post('/legal-document', validateRequest(documentTemplateSchema), asyncHandler(async (req, res) => {
  const { documentType, country, language } = req.body;
  const template = await LocalizationService.getLegalDocumentTemplate(documentType, country, language);
  
  if (!template) {
    return res.status(404).json({
      error: {
        code: 'TEMPLATE_NOT_FOUND',
        message: 'Legal document template not found for the specified parameters',
      },
    });
  }
  
  res.json({
    success: true,
    data: { template },
  });
}));

/**
 * POST /api/localization/email-template
 * Get email template
 */
router.post('/email-template', validateRequest(emailTemplateSchema), asyncHandler(async (req, res) => {
  const { templateType, language } = req.body;
  const template = await LocalizationService.getEmailTemplate(templateType, language);
  
  if (!template) {
    return res.status(404).json({
      error: {
        code: 'TEMPLATE_NOT_FOUND',
        message: 'Email template not found for the specified parameters',
      },
    });
  }
  
  res.json({
    success: true,
    data: { template },
  });
}));

/**
 * GET /api/localization/supported-languages
 * Get list of supported languages
 */
router.get('/supported-languages', asyncHandler(async (req, res) => {
  const config = LocalizationService.getConfig();
  
  const languages = config.supportedLanguages.map(code => ({
    code,
    name: getLanguageName(code),
    nativeName: getLanguageNativeName(code),
  }));
  
  res.json({
    success: true,
    data: { languages },
  });
}));

/**
 * GET /api/localization/supported-countries
 * Get list of supported countries
 */
router.get('/supported-countries', asyncHandler(async (req, res) => {
  const config = LocalizationService.getConfig();
  
  const countries = config.supportedCountries.map(code => ({
    code,
    name: getCountryName(code),
    currency: config.currencyByCountry[code],
    dateFormat: config.dateFormatByCountry[code],
  }));
  
  res.json({
    success: true,
    data: { countries },
  });
}));

/**
 * DELETE /api/localization/cache
 * Clear localization cache (admin only)
 */
router.delete('/cache', authenticate, asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user!.role !== 'ADMIN') {
    return res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required',
      },
    });
  }
  
  const pattern = req.query.pattern as string;
  await LocalizationService.clearCache(pattern);
  
  res.json({
    success: true,
    message: 'Localization cache cleared successfully',
  });
}));

// Helper functions for language and country names
function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    'en': 'English',
    'de': 'German',
    'fr': 'French',
    'es': 'Spanish',
    'it': 'Italian',
    'nl': 'Dutch',
    'pt': 'Portuguese',
    'pl': 'Polish',
    'cs': 'Czech',
    'hu': 'Hungarian',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'hr': 'Croatian',
    'bg': 'Bulgarian',
    'ro': 'Romanian',
    'el': 'Greek',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish',
    'et': 'Estonian',
    'lv': 'Latvian',
    'lt': 'Lithuanian'
  };
  return names[code] || code;
}

function getLanguageNativeName(code: string): string {
  const names: Record<string, string> = {
    'en': 'English',
    'de': 'Deutsch',
    'fr': 'Français',
    'es': 'Español',
    'it': 'Italiano',
    'nl': 'Nederlands',
    'pt': 'Português',
    'pl': 'Polski',
    'cs': 'Čeština',
    'hu': 'Magyar',
    'sk': 'Slovenčina',
    'sl': 'Slovenščina',
    'hr': 'Hrvatski',
    'bg': 'Български',
    'ro': 'Română',
    'el': 'Ελληνικά',
    'sv': 'Svenska',
    'da': 'Dansk',
    'no': 'Norsk',
    'fi': 'Suomi',
    'et': 'Eesti',
    'lv': 'Latviešu',
    'lt': 'Lietuvių'
  };
  return names[code] || code;
}

function getCountryName(code: string): string {
  const names: Record<string, string> = {
    'DE': 'Germany',
    'FR': 'France',
    'ES': 'Spain',
    'IT': 'Italy',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'AT': 'Austria',
    'CH': 'Switzerland',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'PL': 'Poland',
    'CZ': 'Czech Republic',
    'HU': 'Hungary',
    'SK': 'Slovakia',
    'SI': 'Slovenia',
    'HR': 'Croatia',
    'BG': 'Bulgaria',
    'RO': 'Romania',
    'GR': 'Greece',
    'PT': 'Portugal',
    'IE': 'Ireland',
    'LU': 'Luxembourg',
    'CY': 'Cyprus',
    'MT': 'Malta',
    'EE': 'Estonia',
    'LV': 'Latvia',
    'LT': 'Lithuania'
  };
  return names[code] || code;
}

export { router as localizationRoutes };