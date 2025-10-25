import { prisma } from '@eu-real-estate/database';
import { AppError } from '../middleware/error-handler';
import { handlePrismaError } from '@eu-real-estate/database';

export interface PropertyTagData {
  name: string;
  category: string;
  description?: string;
}

export class PropertyTagService {
  /**
   * Create a new property tag
   */
  static async createTag(data: PropertyTagData) {
    try {
      const tag = await prisma.propertyTag.create({
        data: {
          name: data.name,
          category: data.category,
          description: data.description,
        },
      });

      return tag;
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get all tags
   */
  static async getAllTags() {
    try {
      const tags = await prisma.propertyTag.findMany({
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
      });

      return tags;
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get tags by category
   */
  static async getTagsByCategory(category: string) {
    try {
      const tags = await prisma.propertyTag.findMany({
        where: { category },
        orderBy: { name: 'asc' },
      });

      return tags;
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get all categories
   */
  static async getAllCategories() {
    try {
      const categories = await prisma.propertyTag.groupBy({
        by: ['category'],
        orderBy: {
          category: 'asc',
        },
      });

      return categories.map(c => c.category);
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Update a tag
   */
  static async updateTag(id: string, data: Partial<PropertyTagData>) {
    try {
      const tag = await prisma.propertyTag.update({
        where: { id },
        data,
      });

      return tag;
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Delete a tag
   */
  static async deleteTag(id: string) {
    try {
      await prisma.propertyTag.delete({
        where: { id },
      });
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Add tags to property
   */
  static async addTagsToProperty(propertyId: string, tagIds: string[]) {
    try {
      // Check if property exists
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true },
      });

      if (!property) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      // Check if all tags exist
      const tags = await prisma.propertyTag.findMany({
        where: { id: { in: tagIds } },
        select: { id: true },
      });

      if (tags.length !== tagIds.length) {
        throw new AppError('One or more tags not found', 404, 'TAG_NOT_FOUND');
      }

      // Create connections
      const createPromises = tagIds.map(tagId =>
        prisma.propertyToTag.create({
          data: {
            propertyId,
            tagId,
          },
        }).catch(error => {
          // Ignore duplicate key errors
          if (error.code === 'P2002') {
            return null;
          }
          throw error;
        })
      );

      await Promise.all(createPromises);

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Remove tags from property
   */
  static async removeTagsFromProperty(propertyId: string, tagIds: string[]) {
    try {
      await prisma.propertyToTag.deleteMany({
        where: {
          propertyId,
          tagId: {
            in: tagIds,
          },
        },
      });

      return true;
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get property tags
   */
  static async getPropertyTags(propertyId: string) {
    try {
      const propertyTags = await prisma.propertyToTag.findMany({
        where: { propertyId },
        include: {
          tag: true,
        },
      });

      return propertyTags.map(pt => pt.tag);
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Find properties by tag
   */
  static async findPropertiesByTag(tagId: string, limit: number = 10) {
    try {
      const propertyTags = await prisma.propertyToTag.findMany({
        where: { tagId },
        take: limit,
        include: {
          property: {
            include: {
              address: true,
              images: {
                where: { isMain: true },
                take: 1,
              },
            },
          },
        },
      });

      return propertyTags.map(pt => pt.property);
    } catch (error) {
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }
}