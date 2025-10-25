import { Prisma } from '@prisma/client';
import { PaginationOptions, PaginatedResult } from './types';

/**
 * Create pagination parameters for Prisma queries
 */
export function createPaginationParams(options: PaginationOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 10));
  const skip = (page - 1) * limit;

  return {
    skip,
    take: limit,
    page,
    limit,
  };
}

/**
 * Create paginated result object
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Create order by clause for Prisma queries
 */
export function createOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
  if (!sortBy) return undefined;

  return {
    [sortBy]: sortOrder,
  };
}

/**
 * Handle Prisma errors and convert to user-friendly messages
 */
export function handlePrismaError(error: any): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return 'A record with this information already exists.';
      case 'P2014':
        return 'The change you are trying to make would violate the required relation.';
      case 'P2003':
        return 'Foreign key constraint failed.';
      case 'P2025':
        return 'Record not found.';
      default:
        return 'Database operation failed.';
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return 'An unknown database error occurred.';
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return 'Database engine error occurred.';
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return 'Failed to initialize database connection.';
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return 'Invalid data provided.';
  }

  return error.message || 'An unexpected error occurred.';
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .toLowerCase();
}

/**
 * Create full-text search conditions for PostgreSQL
 */
export function createSearchConditions(query: string, fields: string[]) {
  const sanitizedQuery = sanitizeSearchQuery(query);
  if (!sanitizedQuery) return undefined;

  const searchTerms = sanitizedQuery.split(' ').filter(term => term.length > 0);
  
  return {
    OR: fields.flatMap(field => 
      searchTerms.map(term => ({
        [field]: {
          contains: term,
          mode: 'insensitive' as const,
        },
      }))
    ),
  };
}

/**
 * Generate property reference number
 */
export function generatePropertyReference(propertyType: string, country: string): string {
  const typeCode = propertyType.substring(0, 3).toUpperCase();
  const countryCode = country.substring(0, 2).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  
  return `${typeCode}-${countryCode}-${timestamp}-${random}`;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'EUR', locale: string = 'en-EU'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic international format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
}