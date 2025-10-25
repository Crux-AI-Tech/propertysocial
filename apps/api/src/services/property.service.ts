import { prisma } from '@eu-real-estate/database';
import {
  Property,
  PropertyType,
  ListingType,
  PropertyStatus,
  PropertyWithDetails,
  PropertySearchFilters,
  PropertySearchResult,
  PaginationOptions,
  createPaginationParams,
  createPaginatedResult,
  createOrderBy,
  handlePrismaError,
} from '@eu-real-estate/database';
import { AppError } from '../middleware/error-handler';
import { FileUploadService } from './file-upload.service';

export interface CreatePropertyData {
  title: string;
  description: string;
  price: number;
  currency?: string;
  propertyType: PropertyType;
  listingType: ListingType;
  address: {
    street: string;
    city: string;
    postcode: string;
    county?: string;
    country: string;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  features?: {
    bedrooms?: number;
    bathrooms?: number;
    receptionRooms?: number;
    floorArea?: number;
    plotSize?: number;
    floors?: number;
    buildYear?: number;
    energyRating?: string;
    furnished?: boolean;
    garden?: boolean;
    parking?: boolean;
    garage?: boolean;
    balcony?: boolean;
    terrace?: boolean;
    elevator?: boolean;
    airConditioning?: boolean;
    heating?: string;
    petFriendly?: boolean;
  };
  amenities?: string[];
}

export interface UpdatePropertyData extends Partial<CreatePropertyData> {
  status?: PropertyStatus;
  isFeatured?: boolean;
}

export class PropertyService {
  /**
   * Create a new property listing
   */
  static async createProperty(ownerId: string, data: CreatePropertyData): Promise<PropertyWithDetails> {
    try {
      const property = await prisma.property.create({
        data: {
          title: data.title,
          description: data.description,
          price: data.price,
          currency: data.currency || 'EUR',
          propertyType: data.propertyType,
          listingType: data.listingType,
          status: PropertyStatus.DRAFT,
          ownerId,
          address: {
            create: data.address,
          },
          location: data.location ? {
            create: data.location,
          } : undefined,
          features: data.features ? {
            create: data.features,
          } : undefined,
          amenities: data.amenities ? {
            create: data.amenities.map(name => ({
              name,
              category: 'General',
            })),
          } : undefined,
        },
        include: {
          address: true,
          location: true,
          features: true,
          amenities: true,
          images: {
            orderBy: { order: 'asc' },
          },
          documents: true,
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              profile: true,
            },
          },
        },
      });

      return property as PropertyWithDetails;
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get property by ID
   */
  static async getPropertyById(id: string, userId?: string): Promise<PropertyWithDetails> {
    try {
      const property = await prisma.property.findUnique({
        where: { id },
        include: {
          address: true,
          location: true,
          features: true,
          amenities: true,
          images: {
            orderBy: { order: 'asc' },
          },
          documents: true,
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              profile: true,
            },
          },
          favorites: userId ? {
            where: { userId },
            select: { id: true },
          } : false,
        },
      });

      if (!property) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      // Increment view count if property is active
      if (property.status === PropertyStatus.ACTIVE) {
        await prisma.property.update({
          where: { id },
          data: { viewCount: { increment: 1 } },
        });
      }

      return property as PropertyWithDetails;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Update property
   */
  static async updateProperty(
    id: string,
    ownerId: string,
    data: UpdatePropertyData
  ): Promise<PropertyWithDetails> {
    try {
      // Check if property exists and user owns it
      const existingProperty = await prisma.property.findUnique({
        where: { id },
        select: { ownerId: true },
      });

      if (!existingProperty) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      if (existingProperty.ownerId !== ownerId) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      const updateData: any = {};

      // Basic property fields
      if (data.title) updateData.title = data.title;
      if (data.description) updateData.description = data.description;
      if (data.price) updateData.price = data.price;
      if (data.currency) updateData.currency = data.currency;
      if (data.propertyType) updateData.propertyType = data.propertyType;
      if (data.listingType) updateData.listingType = data.listingType;
      if (data.status) updateData.status = data.status;
      if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;

      // Set published date when status changes to active
      if (data.status === PropertyStatus.ACTIVE) {
        updateData.publishedAt = new Date();
      }

      // Update address if provided
      if (data.address) {
        updateData.address = {
          upsert: {
            create: data.address,
            update: data.address,
          },
        };
      }

      // Update location if provided
      if (data.location) {
        updateData.location = {
          upsert: {
            create: data.location,
            update: data.location,
          },
        };
      }

      // Update features if provided
      if (data.features) {
        updateData.features = {
          upsert: {
            create: data.features,
            update: data.features,
          },
        };
      }

      // Update amenities if provided
      if (data.amenities) {
        // Delete existing amenities and create new ones
        await prisma.propertyAmenity.deleteMany({
          where: { propertyId: id },
        });

        updateData.amenities = {
          create: data.amenities.map(name => ({
            name,
            category: 'General',
          })),
        };
      }

      const property = await prisma.property.update({
        where: { id },
        data: updateData,
        include: {
          address: true,
          location: true,
          features: true,
          amenities: true,
          images: {
            orderBy: { order: 'asc' },
          },
          documents: true,
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              profile: true,
            },
          },
        },
      });

      return property as PropertyWithDetails;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Delete property
   */
  static async deleteProperty(id: string, ownerId: string): Promise<void> {
    try {
      // Check if property exists and user owns it
      const existingProperty = await prisma.property.findUnique({
        where: { id },
        select: { ownerId: true },
      });

      if (!existingProperty) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      if (existingProperty.ownerId !== ownerId) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      await prisma.property.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Search properties with filters and pagination
   */
  static async searchProperties(
    filters: PropertySearchFilters = {},
    pagination: PaginationOptions = {},
    userId?: string
  ): Promise<PropertySearchResult> {
    try {
      const { skip, take, page, limit } = createPaginationParams(pagination);
      
      // Build where clause
      const where: any = {
        status: PropertyStatus.ACTIVE,
        isActive: true,
      };

      // Property type filter
      if (filters.propertyType && filters.propertyType.length > 0) {
        where.propertyType = { in: filters.propertyType };
      }

      // Listing type filter
      if (filters.listingType) {
        where.listingType = filters.listingType;
      }

      // Price range filter
      if (filters.minPrice || filters.maxPrice) {
        where.price = {};
        if (filters.minPrice) where.price.gte = filters.minPrice;
        if (filters.maxPrice) where.price.lte = filters.maxPrice;
      }

      // Location filters
      if (filters.country) {
        where.address = { country: filters.country };
      }
      if (filters.city) {
        where.address = { ...where.address, city: filters.city };
      }

      // Features filters
      if (filters.minBedrooms || filters.maxBedrooms || filters.minBathrooms || filters.maxBathrooms || filters.minFloorArea) {
        where.features = {};
        if (filters.minBedrooms) where.features.bedrooms = { gte: filters.minBedrooms };
        if (filters.maxBedrooms) where.features.bedrooms = { ...where.features.bedrooms, lte: filters.maxBedrooms };
        if (filters.minBathrooms) where.features.bathrooms = { gte: filters.minBathrooms };
        if (filters.maxBathrooms) where.features.bathrooms = { ...where.features.bathrooms, lte: filters.maxBathrooms };
        if (filters.minFloorArea) where.features.floorArea = { gte: filters.minFloorArea };
      }

      // Feature boolean filters
      if (filters.features) {
        where.features = { ...where.features };
        Object.entries(filters.features).forEach(([key, value]) => {
          if (value !== undefined) {
            where.features[key] = value;
          }
        });
      }

      // Amenities filter
      if (filters.amenities && filters.amenities.length > 0) {
        where.amenities = {
          some: {
            name: { in: filters.amenities },
          },
        };
      }

      // Get total count
      const total = await prisma.property.count({ where });

      // Get properties
      const properties = await prisma.property.findMany({
        where,
        skip,
        take,
        orderBy: createOrderBy(pagination.sortBy, pagination.sortOrder),
        include: {
          address: true,
          location: true,
          features: true,
          amenities: true,
          images: {
            orderBy: { order: 'asc' },
            take: 5, // Limit images for search results
          },
          documents: false, // Don't include documents in search results
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              profile: {
                select: {
                  company: true,
                },
              },
            },
          },
          favorites: userId ? {
            where: { userId },
            select: { id: true },
          } : false,
        },
      });

      return {
        properties: properties as PropertyWithDetails[],
        total,
        page,
        limit,
        hasMore: skip + take < total,
      };
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get properties by owner
   */
  static async getPropertiesByOwner(
    ownerId: string,
    pagination: PaginationOptions = {}
  ): Promise<PropertySearchResult> {
    try {
      const { skip, take, page, limit } = createPaginationParams(pagination);

      const where = { ownerId };

      const total = await prisma.property.count({ where });

      const properties = await prisma.property.findMany({
        where,
        skip,
        take,
        orderBy: createOrderBy(pagination.sortBy || 'createdAt', pagination.sortOrder),
        include: {
          address: true,
          location: true,
          features: true,
          amenities: true,
          images: {
            orderBy: { order: 'asc' },
          },
          documents: true,
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              profile: true,
            },
          },
        },
      });

      return {
        properties: properties as PropertyWithDetails[],
        total,
        page,
        limit,
        hasMore: skip + take < total,
      };
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Upload property images
   */
  static async uploadPropertyImages(
    propertyId: string,
    ownerId: string,
    files: Express.Multer.File[]
  ): Promise<void> {
    try {
      // Check if property exists and user owns it
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { ownerId: true },
      });

      if (!property) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      if (property.ownerId !== ownerId) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      // Upload files to S3 and create image records
      const imagePromises = files.map(async (file, index) => {
        const uploadResult = await FileUploadService.uploadPropertyImage(file, propertyId);
        
        return prisma.propertyImage.create({
          data: {
            propertyId,
            url: uploadResult.url,
            altText: `Property image ${index + 1}`,
            order: index,
            isMain: index === 0, // First image is main
          },
        });
      });

      await Promise.all(imagePromises);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Delete property image
   */
  static async deletePropertyImage(
    propertyId: string,
    imageId: string,
    ownerId: string
  ): Promise<void> {
    try {
      // Check if property exists and user owns it
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { ownerId: true },
      });

      if (!property) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      if (property.ownerId !== ownerId) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      // Get image details
      const image = await prisma.propertyImage.findUnique({
        where: { id: imageId },
      });

      if (!image || image.propertyId !== propertyId) {
        throw new AppError('Image not found', 404, 'IMAGE_NOT_FOUND');
      }

      // Delete from S3
      await FileUploadService.deleteFile(image.url);

      // Delete from database
      await prisma.propertyImage.delete({
        where: { id: imageId },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Update property status with workflow tracking
   */
  static async updatePropertyStatus(
    id: string,
    ownerId: string,
    status: PropertyStatus,
    notes?: string
  ): Promise<PropertyWithDetails> {
    try {
      // Get current property status
      const currentProperty = await prisma.property.findUnique({
        where: { id },
        select: { 
          status: true,
          ownerId: true
        },
      });

      if (!currentProperty) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      // Check ownership or admin role
      if (currentProperty.ownerId !== ownerId) {
        const user = await prisma.user.findUnique({
          where: { id: ownerId },
          select: { role: true },
        });

        if (!user || user.role !== UserRole.ADMIN) {
          throw new AppError('Access denied', 403, 'ACCESS_DENIED');
        }
      }

      const updateData: any = { status };

      // Set dates based on status transitions
      if (status === PropertyStatus.ACTIVE) {
        updateData.publishedAt = new Date();
      } else if (status === PropertyStatus.SOLD || status === PropertyStatus.RENTED) {
        updateData.expiresAt = new Date();
      }

      // Create status history entry
      const statusHistory = await prisma.propertyStatusHistory.create({
        data: {
          propertyId: id,
          previousStatus: currentProperty.status,
          newStatus: status,
          changedById: ownerId,
          notes: notes || `Status changed from ${currentProperty.status} to ${status}`,
        },
      });

      // Update property status
      const property = await prisma.property.update({
        where: { id },
        data: updateData,
        include: {
          address: true,
          location: true,
          features: true,
          amenities: true,
          images: {
            orderBy: { order: 'asc' },
          },
          documents: true,
          tags: {
            include: {
              tag: true,
            }
          },
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              profile: true,
            },
          },
          statusHistory: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
            include: {
              changedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                }
              }
            }
          }
        },
      });

      // Format the response to include tags
      const formattedProperty = {
        ...property,
        tags: property.tags.map(pt => pt.tag),
      };

      return formattedProperty as PropertyWithDetails;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get featured properties
   */
  static async getFeaturedProperties(limit: number = 10): Promise<PropertyWithDetails[]> {
    try {
      const properties = await prisma.property.findMany({
        where: {
          status: PropertyStatus.ACTIVE,
          isActive: true,
          isFeatured: true,
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          address: true,
          location: true,
          features: true,
          amenities: true,
          images: {
            orderBy: { order: 'asc' },
            take: 3,
          },
          documents: false,
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              profile: {
                select: {
                  company: true,
                },
              },
            },
          },
        },
      });

      return properties as PropertyWithDetails[];
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get similar properties based on type, location, and price
   */
  static async getSimilarProperties(
    propertyId: string,
    limit: number = 4
  ): Promise<PropertyWithDetails[]> {
    try {
      // Get the reference property
      const referenceProperty = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          address: true,
          features: true,
        },
      });

      if (!referenceProperty) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      // Find similar properties
      const properties = await prisma.property.findMany({
        where: {
          id: { not: propertyId },
          status: PropertyStatus.ACTIVE,
          isActive: true,
          propertyType: referenceProperty.propertyType,
          listingType: referenceProperty.listingType,
          address: {
            city: referenceProperty.address?.city,
            country: referenceProperty.address?.country,
          },
          price: {
            gte: Number(referenceProperty.price) * 0.8,
            lte: Number(referenceProperty.price) * 1.2,
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          address: true,
          location: true,
          features: true,
          amenities: true,
          images: {
            orderBy: { order: 'asc' },
            take: 1,
          },
          documents: false,
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              profile: {
                select: {
                  company: true,
                },
              },
            },
          },
        },
      });

      return properties as PropertyWithDetails[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Add property to user favorites
   */
  static async addToFavorites(propertyId: string, userId: string): Promise<void> {
    try {
      // Check if property exists
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true },
      });

      if (!property) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      // Add to favorites (ignore if already exists)
      await prisma.propertyFavorite.create({
        data: {
          propertyId,
          userId,
        },
      }).catch(error => {
        // Ignore duplicate key errors
        if (error.code !== 'P2002') {
          throw error;
        }
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Remove property from user favorites
   */
  static async removeFromFavorites(propertyId: string, userId: string): Promise<void> {
    try {
      await prisma.propertyFavorite.deleteMany({
        where: {
          propertyId,
          userId,
        },
      });
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get user's favorite properties
   */
  static async getUserFavorites(
    userId: string,
    pagination: PaginationOptions = {}
  ): Promise<PropertySearchResult> {
    try {
      const { skip, take, page, limit } = createPaginationParams(pagination);

      const where = {
        favorites: {
          some: { userId },
        },
        status: PropertyStatus.ACTIVE,
        isActive: true,
      };

      const total = await prisma.property.count({ where });

      const properties = await prisma.property.findMany({
        where,
        skip,
        take,
        orderBy: createOrderBy(pagination.sortBy || 'createdAt', pagination.sortOrder),
        include: {
          address: true,
          location: true,
          features: true,
          amenities: true,
          images: {
            orderBy: { order: 'asc' },
            take: 3,
          },
          documents: false,
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              profile: {
                select: {
                  company: true,
                },
              },
            },
          },
          favorites: {
            where: { userId },
            select: { id: true, createdAt: true },
          },
        },
      });

      return {
        properties: properties as PropertyWithDetails[],
        total,
        page,
        limit,
        hasMore: skip + take < total,
      };
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get property analytics for owner
   */
  static async getPropertyAnalytics(propertyId: string, ownerId: string): Promise<any> {
    try {
      // Check ownership
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { ownerId: true, viewCount: true, createdAt: true },
      });

      if (!property) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      if (property.ownerId !== ownerId) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      // Get favorites count
      const favoritesCount = await prisma.propertyFavorite.count({
        where: { propertyId },
      });

      // Get similar properties count for comparison
      const similarPropertiesCount = await prisma.property.count({
        where: {
          id: { not: propertyId },
          status: PropertyStatus.ACTIVE,
          isActive: true,
        },
      });

      // Calculate days since listing
      const daysSinceListing = Math.floor(
        (Date.now() - property.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        viewCount: property.viewCount,
        favoritesCount,
        daysSinceListing,
        similarPropertiesCount,
        averageViewsPerDay: daysSinceListing > 0 ? property.viewCount / daysSinceListing : 0,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Upload property documents
   */
  static async uploadPropertyDocuments(
    propertyId: string,
    ownerId: string,
    files: Express.Multer.File[]
  ): Promise<void> {
    try {
      // Check if property exists and user owns it
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { ownerId: true },
      });

      if (!property) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      if (property.ownerId !== ownerId) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      // Upload files and create document records
      const documentPromises = files.map(async (file) => {
        const uploadResult = await FileUploadService.uploadPropertyDocument(file, propertyId);
        
        return prisma.propertyDocument.create({
          data: {
            propertyId,
            name: file.originalname,
            url: uploadResult.url,
            type: file.mimetype,
            size: file.size,
          },
        });
      });

      await Promise.all(documentPromises);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Delete property document
   */
  static async deletePropertyDocument(
    propertyId: string,
    documentId: string,
    ownerId: string
  ): Promise<void> {
    try {
      // Check if property exists and user owns it
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { ownerId: true },
      });

      if (!property) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      if (property.ownerId !== ownerId) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      // Get document details
      const document = await prisma.propertyDocument.findUnique({
        where: { id: documentId },
      });

      if (!document || document.propertyId !== propertyId) {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Delete from S3
      await FileUploadService.deleteFile(document.url);

      // Delete from database
      await prisma.propertyDocument.delete({
        where: { id: documentId },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }
}