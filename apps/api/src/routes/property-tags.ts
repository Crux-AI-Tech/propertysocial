import { Router } from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validateRequest, validateParams } from '../middleware/validation';
import { PropertyTagService } from '../services/property-tag.service';
import { UserRole } from '@eu-real-estate/database';

const router = Router();

// Validation schemas
const createTagSchema = Joi.object({
  name: Joi.string().required().min(2).max(50),
  category: Joi.string().required().min(2).max(50),
  description: Joi.string().optional().max(200),
});

const updateTagSchema = Joi.object({
  name: Joi.string().optional().min(2).max(50),
  category: Joi.string().optional().min(2).max(50),
  description: Joi.string().optional().max(200),
});

const tagIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const propertyTagsSchema = Joi.object({
  tagIds: Joi.array().items(Joi.string().uuid()).required().min(1),
});

/**
 * GET /api/property-tags
 * Get all property tags
 */
router.get('/', asyncHandler(async (req, res) => {
  const tags = await PropertyTagService.getAllTags();
  
  res.json({
    success: true,
    data: { tags },
  });
}));

/**
 * GET /api/property-tags/categories
 * Get all tag categories
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await PropertyTagService.getAllCategories();
  
  res.json({
    success: true,
    data: { categories },
  });
}));

/**
 * GET /api/property-tags/category/:category
 * Get tags by category
 */
router.get('/category/:category', asyncHandler(async (req, res) => {
  const tags = await PropertyTagService.getTagsByCategory(req.params.category);
  
  res.json({
    success: true,
    data: { tags },
  });
}));

/**
 * POST /api/property-tags
 * Create a new property tag (admin only)
 */
router.post('/', authenticate, authorize(UserRole.ADMIN), validateRequest(createTagSchema), asyncHandler(async (req, res) => {
  const tag = await PropertyTagService.createTag(req.body);
  
  res.status(201).json({
    success: true,
    message: 'Tag created successfully',
    data: { tag },
  });
}));

/**
 * PUT /api/property-tags/:id
 * Update a property tag (admin only)
 */
router.put('/:id', authenticate, authorize(UserRole.ADMIN), validateParams(tagIdSchema), validateRequest(updateTagSchema), asyncHandler(async (req, res) => {
  const tag = await PropertyTagService.updateTag(req.params.id, req.body);
  
  res.json({
    success: true,
    message: 'Tag updated successfully',
    data: { tag },
  });
}));

/**
 * DELETE /api/property-tags/:id
 * Delete a property tag (admin only)
 */
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), validateParams(tagIdSchema), asyncHandler(async (req, res) => {
  await PropertyTagService.deleteTag(req.params.id);
  
  res.json({
    success: true,
    message: 'Tag deleted successfully',
  });
}));

/**
 * GET /api/property-tags/property/:propertyId
 * Get tags for a property
 */
router.get('/property/:propertyId', validateParams(Joi.object({
  propertyId: Joi.string().uuid().required(),
})), asyncHandler(async (req, res) => {
  const tags = await PropertyTagService.getPropertyTags(req.params.propertyId);
  
  res.json({
    success: true,
    data: { tags },
  });
}));

/**
 * POST /api/property-tags/property/:propertyId
 * Add tags to a property (property owner or admin only)
 */
router.post('/property/:propertyId', authenticate, validateParams(Joi.object({
  propertyId: Joi.string().uuid().required(),
})), validateRequest(propertyTagsSchema), asyncHandler(async (req, res) => {
  // Note: Property ownership check is done in the service
  await PropertyTagService.addTagsToProperty(req.params.propertyId, req.body.tagIds);
  
  res.json({
    success: true,
    message: 'Tags added to property successfully',
  });
}));

/**
 * DELETE /api/property-tags/property/:propertyId
 * Remove tags from a property (property owner or admin only)
 */
router.delete('/property/:propertyId', authenticate, validateParams(Joi.object({
  propertyId: Joi.string().uuid().required(),
})), validateRequest(propertyTagsSchema), asyncHandler(async (req, res) => {
  // Note: Property ownership check is done in the service
  await PropertyTagService.removeTagsFromProperty(req.params.propertyId, req.body.tagIds);
  
  res.json({
    success: true,
    message: 'Tags removed from property successfully',
  });
}));

/**
 * GET /api/property-tags/:id/properties
 * Get properties with a specific tag
 */
router.get('/:id/properties', validateParams(tagIdSchema), asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const properties = await PropertyTagService.findPropertiesByTag(req.params.id, limit);
  
  res.json({
    success: true,
    data: { properties },
  });
}));

export { router as propertyTagRoutes };