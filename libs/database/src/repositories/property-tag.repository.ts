import { BaseRepository } from './base.repository';
import { DatabaseResult } from '../types';

/**
 * Property tag repository for managing property tags and categories
 */
export class PropertyTagRepository extends BaseRepository<any> {
  constructor() {
    super('propertyTag');
  }

  /**
   * Get all tags by category
   */
  async getTagsByCategory(category: string): Promise<DatabaseResult<any[]>> {
    try {
      const tags = await this.prisma.propertyTag.findMany({
        where: { category },
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        data: tags,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get tags by category',
      };
    }
  }

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<DatabaseResult<string[]>> {
    try {
      const categories = await this.prisma.propertyTag.groupBy({
        by: ['category'],
        orderBy: {
          category: 'asc',
        },
      });

      return {
        success: true,
        data: categories.map(c => c.category),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get all categories',
      };
    }
  }

  /**
   * Add tags to property
   */
  async addTagsToProperty(
    propertyId: string,
    tagIds: string[]
  ): Promise<DatabaseResult<boolean>> {
    try {
      const createPromises = tagIds.map(tagId =>
        this.prisma.propertyToTag.create({
          data: {
            propertyId,
            tagId,
          },
        })
      );

      await Promise.all(createPromises);

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to add tags to property',
      };
    }
  }

  /**
   * Remove tags from property
   */
  async removeTagsFromProperty(
    propertyId: string,
    tagIds: string[]
  ): Promise<DatabaseResult<boolean>> {
    try {
      await this.prisma.propertyToTag.deleteMany({
        where: {
          propertyId,
          tagId: {
            in: tagIds,
          },
        },
      });

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to remove tags from property',
      };
    }
  }

  /**
   * Get property tags
   */
  async getPropertyTags(propertyId: string): Promise<DatabaseResult<any[]>> {
    try {
      const propertyTags = await this.prisma.propertyToTag.findMany({
        where: { propertyId },
        include: {
          tag: true,
        },
      });

      return {
        success: true,
        data: propertyTags.map(pt => pt.tag),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get property tags',
      };
    }
  }

  /**
   * Find properties by tag
   */
  async findPropertiesByTag(
    tagId: string,
    limit: number = 10
  ): Promise<DatabaseResult<any[]>> {
    try {
      const propertyTags = await this.prisma.propertyToTag.findMany({
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

      return {
        success: true,
        data: propertyTags.map(pt => pt.property),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to find properties by tag',
      };
    }
  }
}