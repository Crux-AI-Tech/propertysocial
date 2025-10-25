import { Router } from 'express';
import multer from 'multer';
import Joi from 'joi';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validateRequest, validateQuery, validateParams } from '../middleware/validation';
import { PropertyService } from '../services/property.service';
import { UserRole, PropertyType, ListingType, PropertyStatus } from '@eu-real-estate/database';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Validation schemas
const createPropertySchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().min(20).max(5000).required(),
  price: Joi.number().positive().required(),
  currency: Joi.string().length(3).default('EUR'),
  propertyType: Joi.string().valid(...Object.values(PropertyType)).required(),
  listingType: Joi.string().valid(...Object.values(ListingType)).required(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    postcode: Joi.string().required(),
    county: Joi.string().optional(),
    country: Joi.string().length(2).required(),
  }).required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).optional(),
  features: Joi.object({
    bedrooms: Joi.number().integer().min(0).max(20).optional(),
    bathrooms: Joi.number().integer().min(0).max(20).optional(),
    receptionRooms: Joi.number().integer().min(0).max(20).optional(),
    floorArea: Joi.number().positive().optional(),
    plotSize: Joi.number().positive().optional(),
    floors: Joi.number().integer().min(1).max(50).optional(),
    buildYear: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional(),
    energyRating: Joi.string().valid('A', 'B', 'C', 'D', 'E', 'F', 'G').optional(),
    furnished: Joi.boolean().optional(),
    garden: Joi.boolean().optional(),
    parking: Joi.boolean().optional(),
    garage: Joi.boolean().optional(),
    balcony: Joi.boolean().optional(),
    terrace: Joi.boolean().optional(),
    elevator: Joi.boolean().optional(),
    airConditioning: Joi.boolean().optional(),
    heating: Joi.string().optional(),
    petFriendly: Joi.boolean().optional(),
  }).optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
});

const updatePropertySchema = createPropertySchema.fork(
  ['title', 'description', 'price', 'propertyType', 'listingType', 'address'],
  (schema) => schema.optional()
).keys({
  status: Joi.string().valid(...Object.values(PropertyStatus)).optional(),
  isFeatured: Joi.boolean().optional(),
});

const searchPropertiesSchema = Joi.object({
  propertyType: Joi.array().items(Joi.string().valid(...Object.values(PropertyType))).optional(),
  listingType: Joi.string().valid(...Object.values(ListingType)).optional(),
  minPrice: Joi.number().positive().optional(),
  maxPrice: Joi.number().positive().optional(),
  minBedrooms: Joi.number().integer().min(0).optional(),
  maxBedrooms: Joi.number().integer().min(0).optional(),
  minBathrooms: Joi.number().integer().min(0).optional(),
  maxBathrooms: Joi.number().integer().min(0).optional(),
  minFloorArea: Joi.number().positive().optional(),
  country: Joi.string().length(2).optional(),
  city: Joi.string().optional(),
  garden: Joi.boolean().optional(),
  parking: Joi.boolean().optional(),
  furnished: Joi.boolean().optional(),
  petFriendly: Joi.boolean().optional(),
  balcony: Joi.boolean().optional(),
  terrace: Joi.boolean().optional(),
  elevator: Joi.boolean().optional(),
  airConditioning: Joi.boolean().optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('price', 'createdAt', 'viewCount', 'title').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const propertyIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(PropertyStatus)).required(),
  notes: Joi.string().max(500).optional(),
});

/**
 * GET /api/properties
 * Search properties with filters and pagination
 */
router.get('/', optionalAuth, validateQuery(searchPropertiesSchema), asyncHandler(async (req, res) => {
  const filters = {
    propertyType: req.query.propertyType,
    listingType: req.query.listingType,
    minPrice: req.query.minPrice,
    maxPrice: req.query.maxPrice,
    minBedrooms: req.query.minBedrooms,
    maxBedrooms: req.query.maxBedrooms,
    minBathrooms: req.query.minBathrooms,
    maxBathrooms: req.query.maxBathrooms,
    minFloorArea: req.query.minFloorArea,
    country: req.query.country,
    city: req.query.city,
    features: {
      garden: req.query.garden,
      parking: req.query.parking,
      furnished: req.query.furnished,
      petFriendly: req.query.petFriendly,
      balcony: req.query.balcony,
      terrace: req.query.terrace,
      elevator: req.query.elevator,
      airConditioning: req.query.airConditioning,
    },
    amenities: req.query.amenities,
  };

  const pagination = {
    page: req.query.page,
    limit: req.query.limit,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder,
  };

  const result = await PropertyService.searchProperties(filters, pagination, req.user?.id);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * POST /api/properties
 * Create new property listing
 */
router.post('/', authenticate, authorize(UserRole.AGENT, UserRole.SELLER), validateRequest(createPropertySchema), asyncHandler(async (req, res) => {
  const property = await PropertyService.createProperty(req.user!.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Property created successfully',
    data: { property },
  });
}));

/**
 * GET /api/properties/featured
 * Get featured properties
 */
router.get('/featured', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const properties = await PropertyService.getFeaturedProperties(limit);

  res.json({
    success: true,
    data: { properties },
  });
}));

/**
 * GET /api/properties/favorites
 * Get user's favorite properties
 */
router.get('/favorites', authenticate, asyncHandler(async (req, res) => {
  const pagination = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 10,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as 'asc' | 'desc',
  };

  const result = await PropertyService.getUserFavorites(req.user!.id, pagination);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * GET /api/properties/my
 * Get current user's properties
 */
router.get('/my', authenticate, asyncHandler(async (req, res) => {
  const pagination = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 10,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as 'asc' | 'desc',
  };

  const result = await PropertyService.getPropertiesByOwner(req.user!.id, pagination);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * GET /api/properties/:id
 * Get property by ID
 */
router.get('/:id', optionalAuth, validateParams(propertyIdSchema), asyncHandler(async (req, res) => {
  const property = await PropertyService.getPropertyById(req.params.id, req.user?.id);

  res.json({
    success: true,
    data: { property },
  });
}));

/**
 * PUT /api/properties/:id
 * Update property
 */
router.put('/:id', authenticate, validateParams(propertyIdSchema), validateRequest(updatePropertySchema), asyncHandler(async (req, res) => {
  const property = await PropertyService.updateProperty(req.params.id, req.user!.id, req.body);

  res.json({
    success: true,
    message: 'Property updated successfully',
    data: { property },
  });
}));

/**
 * DELETE /api/properties/:id
 * Delete property
 */
router.delete('/:id', authenticate, validateParams(propertyIdSchema), asyncHandler(async (req, res) => {
  await PropertyService.deleteProperty(req.params.id, req.user!.id);

  res.json({
    success: true,
    message: 'Property deleted successfully',
  });
}));

/**
 * PATCH /api/properties/:id/status
 * Update property status
 */
router.patch('/:id/status', authenticate, validateParams(propertyIdSchema), validateRequest(updateStatusSchema), asyncHandler(async (req, res) => {
  const property = await PropertyService.updatePropertyStatus(
    req.params.id, 
    req.user!.id, 
    req.body.status,
    req.body.notes
  );

  res.json({
    success: true,
    message: 'Property status updated successfully',
    data: { property },
  });
}));

/**
 * POST /api/properties/:id/images
 * Upload property images
 */
router.post('/:id/images', authenticate, validateParams(propertyIdSchema), upload.array('images', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: {
        code: 'NO_FILES',
        message: 'No images provided',
      },
    });
  }

  await PropertyService.uploadPropertyImages(req.params.id, req.user!.id, req.files as Express.Multer.File[]);

  res.json({
    success: true,
    message: 'Images uploaded successfully',
  });
}));

/**
 * DELETE /api/properties/:id/images/:imageId
 * Delete property image
 */
router.delete('/:id/images/:imageId', authenticate, validateParams(Joi.object({
  id: Joi.string().uuid().required(),
  imageId: Joi.string().uuid().required(),
})), asyncHandler(async (req, res) => {
  await PropertyService.deletePropertyImage(req.params.id, req.params.imageId, req.user!.id);

  res.json({
    success: true,
    message: 'Image deleted successfully',
  });
}));

/**
 * POST /api/properties/:id/documents
 * Upload property documents
 */
router.post('/:id/documents', authenticate, validateParams(propertyIdSchema), upload.array('documents', 5), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: {
        code: 'NO_FILES',
        message: 'No documents provided',
      },
    });
  }

  await PropertyService.uploadPropertyDocuments(req.params.id, req.user!.id, req.files as Express.Multer.File[]);

  res.json({
    success: true,
    message: 'Documents uploaded successfully',
  });
}));

/**
 * DELETE /api/properties/:id/documents/:documentId
 * Delete property document
 */
router.delete('/:id/documents/:documentId', authenticate, validateParams(Joi.object({
  id: Joi.string().uuid().required(),
  documentId: Joi.string().uuid().required(),
})), asyncHandler(async (req, res) => {
  await PropertyService.deletePropertyDocument(req.params.id, req.params.documentId, req.user!.id);

  res.json({
    success: true,
    message: 'Document deleted successfully',
  });
}));

/**
 * GET /api/properties/:id/similar
 * Get similar properties
 */
router.get('/:id/similar', validateParams(propertyIdSchema), asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 4;
  const properties = await PropertyService.getSimilarProperties(req.params.id, limit);

  res.json({
    success: true,
    data: { properties },
  });
}));

/**
 * POST /api/properties/:id/favorites
 * Add property to favorites
 */
router.post('/:id/favorites', authenticate, validateParams(propertyIdSchema), asyncHandler(async (req, res) => {
  await PropertyService.addToFavorites(req.params.id, req.user!.id);

  res.json({
    success: true,
    message: 'Property added to favorites',
  });
}));

/**
 * DELETE /api/properties/:id/favorites
 * Remove property from favorites
 */
router.delete('/:id/favorites', authenticate, validateParams(propertyIdSchema), asyncHandler(async (req, res) => {
  await PropertyService.removeFromFavorites(req.params.id, req.user!.id);

  res.json({
    success: true,
    message: 'Property removed from favorites',
  });
}));

/**
 * GET /api/properties/:id/analytics
 * Get property analytics (owner only)
 */
router.get('/:id/analytics', authenticate, validateParams(propertyIdSchema), asyncHandler(async (req, res) => {
  const analytics = await PropertyService.getPropertyAnalytics(req.params.id, req.user!.id);

  res.json({
    success: true,
    data: { analytics },
  });
}));

export { router as propertyRoutes };