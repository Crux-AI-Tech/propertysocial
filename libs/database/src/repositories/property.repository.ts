import { Property, PropertyStatus, PropertyType, ListingType } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { DatabaseResult, PropertyWithDetails, PropertySearchFilters, PaginatedResult } from '../types';
import { createPaginationParams, createOrderBy, createPaginatedResult } from '../utils';

/**
 * Property repository for property-related database operations
 */
export class PropertyRepository extends BaseRepository<Property> {
  constructor() {
    super('property');
  }

  /**
   * Find a property with all details
   */
  async findWithDetails(id: string): Promise<DatabaseResult<PropertyWithDetails>> {
    try {
      const property = await this.prisma.property.findUnique({
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
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
              role: true,
              profile: {
                select: {
                  company: true,
                  website: true,
                },
              },
            },
          },
        },
      });

      return {
        success: !!property,
        data: property as PropertyWithDetails,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to find property with details',
      };
    }
  }

  /**
   * Search properties with filters
   */
  async search(
    filters: PropertySearchFilters,
    pagination?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<DatabaseResult<PaginatedResult<PropertyWithDetails>>> {
    try {
      const { skip, take, page, limit } = createPaginationParams(pagination);
      const orderBy = createOrderBy(pagination?.sortBy || 'createdAt', pagination?.sortOrder || 'desc');

      // Build where conditions based on filters
      const where: any = {
        isActive: true,
        status: PropertyStatus.ACTIVE,
      };

      // Apply filters
      if (filters.propertyType && filters.propertyType.length > 0) {
        where.propertyType = { in: filters.propertyType };
      }

      if (filters.listingType) {
        where.listingType = filters.listingType;
      }

      if (filters.minPrice || filters.maxPrice) {
        where.price = {};
        if (filters.minPrice) where.price.gte = filters.minPrice;
        if (filters.maxPrice) where.price.lte = filters.maxPrice;
      }

      if (filters.country) {
        where.address = {
          ...where.address,
          country: filters.country,
        };
      }

      if (filters.city) {
        where.address = {
          ...where.address,
          city: filters.city,
        };
      }

      // Features filters
      if (filters.minBedrooms || filters.maxBedrooms || filters.minBathrooms || filters.features) {
        where.features = {};

        if (filters.minBedrooms) {
          where.features.bedrooms = { gte: filters.minBedrooms };
        }

        if (filters.maxBedrooms) {
          where.features.bedrooms = { 
            ...where.features.bedrooms,
            lte: filters.maxBedrooms 
          };
        }

        if (filters.minBathrooms) {
          where.features.bathrooms = { gte: filters.minBathrooms };
        }

        if (filters.features) {
          Object.entries(filters.features).forEach(([key, value]) => {
            if (value === true) {
              where.features[key] = true;
            }
          });
        }
      }

      // Amenities filter
      if (filters.amenities && filters.amenities.length > 0) {
        where.amenities = {
          some: {
            name: { in: filters.amenities },
          },
        };
      }

      // Execute query
      const [properties, total] = await Promise.all([
        this.prisma.property.findMany({
          where,
          include: {
            address: true,
            location: true,
            features: true,
            amenities: true,
            images: {
              where: { isMain: true },
              take: 1,
            },
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
          skip,
          take,
          orderBy,
        }),
        this.prisma.property.count({ where }),
      ]);

      return {
        success: true,
        data: createPaginatedResult(properties as PropertyWithDetails[], total, page, limit),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to search properties',
      };
    }
  }

  /**
   * Get featured properties
   */
  async getFeatured(limit: number = 6): Promise<DatabaseResult<PropertyWithDetails[]>> {
    try {
      const properties = await this.prisma.property.findMany({
        where: {
          isActive: true,
          status: PropertyStatus.ACTIVE,
          isFeatured: true,
        },
        include: {
          address: true,
          features: true,
          images: {
            where: { isMain: true },
            take: 1,
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: properties as PropertyWithDetails[],
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get featured properties',
      };
    }
  }

  /**
   * Get similar properties
   */
  async getSimilar(
    propertyId: string,
    limit: number = 4
  ): Promise<DatabaseResult<PropertyWithDetails[]>> {
    try {
      // Get the original property to find similar ones
      const property = await this.prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          address: true,
          features: true,
        },
      });

      if (!property) {
        return {
          success: false,
          error: 'Property not found',
        };
      }

      // Find similar properties based on type, location, and price range
      const similarProperties = await this.prisma.property.findMany({
        where: {
          id: { not: propertyId },
          isActive: true,
          status: PropertyStatus.ACTIVE,
          propertyType: property.propertyType,
          listingType: property.listingType,
          address: {
            city: property.address?.city,
            country: property.address?.country,
          },
          price: {
            gte: Number(property.price) * 0.8,
            lte: Number(property.price) * 1.2,
          },
        },
        include: {
          address: true,
          features: true,
          images: {
            where: { isMain: true },
            take: 1,
          },
        },
        take: limit,
      });

      return {
        success: true,
        data: similarProperties as PropertyWithDetails[],
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get similar properties',
      };
    }
  }

  /**
   * Create a property with all related details
   */
  async createWithDetails(propertyData: {
    title: string;
    description: string;
    price: number;
    currency: string;
    propertyType: PropertyType;
    listingType: ListingType;
    status?: PropertyStatus;
    ownerId: string;
    address?: {
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
    features?: any;
    amenities?: string[];
    images?: Array<{
      url: string;
      altText?: string;
      caption?: string;
      isMain?: boolean;
    }>;
  }): Promise<DatabaseResult<PropertyWithDetails>> {
    try {
      const { address, location, features, amenities, images, ...propertyInfo } = propertyData;

      // Create property with nested relations
      const property = await this.prisma.property.create({
        data: {
          ...propertyInfo,
          status: propertyInfo.status || PropertyStatus.DRAFT,
          address: address ? { create: address } : undefined,
          location: location ? { create: location } : undefined,
          features: features ? { create: features } : undefined,
          amenities: amenities
            ? {
                create: amenities.map((name) => ({
                  name,
                  category: 'General',
                })),
              }
            : undefined,
          images: images
            ? {
                create: images.map((img, index) => ({
                  ...img,
                  order: index,
                  isMain: img.isMain || index === 0,
                })),
              }
            : undefined,
        },
        include: {
          address: true,
          location: true,
          features: true,
          amenities: true,
          images: true,
          owner: true,
        },
      });

      return {
        success: true,
        data: property as PropertyWithDetails,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create property with details',
      };
    }
  }

  /**
   * Update property status
   */
  async updateStatus(
    id: string,
    status: PropertyStatus
  ): Promise<DatabaseResult<Property>> {
    try {
      const property = await this.prisma.property.update({
        where: { id },
        data: {
          status,
          publishedAt: status === PropertyStatus.ACTIVE ? new Date() : undefined,
        },
      });

      return {
        success: true,
        data: property,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update property status',
      };
    }
  }

  /**
   * Increment property view count
   */
  async incrementViewCount(id: string): Promise<DatabaseResult<Property>> {
    try {
      const property = await this.prisma.property.update({
        where: { id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });

      return {
        success: true,
        data: property,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to increment property view count',
      };
    }
  }

  /**
   * Add property to user favorites
   */
  async addToFavorites(
    propertyId: string,
    userId: string
  ): Promise<DatabaseResult<any>> {
    try {
      const favorite = await this.prisma.propertyFavorite.create({
        data: {
          propertyId,
          userId,
        },
      });

      return {
        success: true,
        data: favorite,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to add property to favorites',
      };
    }
  }

  /**
   * Remove property from user favorites
   */
  async removeFromFavorites(
    propertyId: string,
    userId: string
  ): Promise<DatabaseResult<boolean>> {
    try {
      await this.prisma.propertyFavorite.deleteMany({
        where: {
          propertyId,
          userId,
        },
      });

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to remove property from favorites',
      };
    }
  }

  /**
   * Check if property is in user favorites
   */
  async isInFavorites(
    propertyId: string,
    userId: string
  ): Promise<DatabaseResult<boolean>> {
    try {
      const favorite = await this.prisma.propertyFavorite.findFirst({
        where: {
          propertyId,
          userId,
        },
      });

      return {
        success: true,
        data: !!favorite,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to check if property is in favorites',
      };
    }
  }
}