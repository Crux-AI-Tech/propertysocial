import { PrismaClient } from '@prisma/client';
import { DatabaseResult, PaginationOptions, PaginatedResult } from '../types';
import { createPaginationParams, createOrderBy, handlePrismaError, createPaginatedResult } from '../utils';
import { prisma } from '../client';

/**
 * Base repository class with common CRUD operations
 */
export abstract class BaseRepository<T> {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  /**
   * Find a record by ID
   */
  async findById(id: string, include?: any): Promise<DatabaseResult<T>> {
    try {
      // @ts-ignore - Dynamic access to Prisma models
      const result = await this.prisma[this.modelName].findUnique({
        where: { id },
        include,
      });

      return {
        success: !!result,
        data: result as T,
      };
    } catch (error) {
      return {
        success: false,
        error: handlePrismaError(error),
      };
    }
  }

  /**
   * Find all records with pagination
   */
  async findAll(options?: {
    where?: any;
    include?: any;
    pagination?: PaginationOptions;
  }): Promise<DatabaseResult<PaginatedResult<T>>> {
    try {
      const { where = {}, include = {}, pagination } = options || {};
      const { skip, take, page, limit } = createPaginationParams(pagination);
      const orderBy = createOrderBy(pagination?.sortBy, pagination?.sortOrder);

      // @ts-ignore - Dynamic access to Prisma models
      const [results, total] = await Promise.all([
        // @ts-ignore - Dynamic access to Prisma models
        this.prisma[this.modelName].findMany({
          where,
          include,
          skip,
          take,
          orderBy,
        }),
        // @ts-ignore - Dynamic access to Prisma models
        this.prisma[this.modelName].count({ where }),
      ]);

      return {
        success: true,
        data: createPaginatedResult(results as T[], total, page, limit),
      };
    } catch (error) {
      return {
        success: false,
        error: handlePrismaError(error),
      };
    }
  }

  /**
   * Create a new record
   */
  async create(data: any): Promise<DatabaseResult<T>> {
    try {
      // @ts-ignore - Dynamic access to Prisma models
      const result = await this.prisma[this.modelName].create({
        data,
      });

      return {
        success: true,
        data: result as T,
      };
    } catch (error) {
      return {
        success: false,
        error: handlePrismaError(error),
      };
    }
  }

  /**
   * Update an existing record
   */
  async update(id: string, data: any): Promise<DatabaseResult<T>> {
    try {
      // @ts-ignore - Dynamic access to Prisma models
      const result = await this.prisma[this.modelName].update({
        where: { id },
        data,
      });

      return {
        success: true,
        data: result as T,
      };
    } catch (error) {
      return {
        success: false,
        error: handlePrismaError(error),
      };
    }
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<DatabaseResult<T>> {
    try {
      // @ts-ignore - Dynamic access to Prisma models
      const result = await this.prisma[this.modelName].delete({
        where: { id },
      });

      return {
        success: true,
        data: result as T,
      };
    } catch (error) {
      return {
        success: false,
        error: handlePrismaError(error),
      };
    }
  }

  /**
   * Count records
   */
  async count(where: any = {}): Promise<DatabaseResult<number>> {
    try {
      // @ts-ignore - Dynamic access to Prisma models
      const count = await this.prisma[this.modelName].count({ where });

      return {
        success: true,
        data: count,
      };
    } catch (error) {
      return {
        success: false,
        error: handlePrismaError(error),
      };
    }
  }
}