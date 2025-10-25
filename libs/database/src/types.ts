import type { Prisma } from '@prisma/client';
import type {
  User,
  UserProfile,
  UserPreferences,
  UserVerification,
  Property,
  PropertyAddress,
  PropertyLocation,
  PropertyFeatures,
  PropertyAmenity,
  PropertyImage,
  PropertyDocument,
  Transaction,
  TransactionDocument,
  SavedSearch,
  PropertyFavorite,
  Message,
  Notification,
  Review,
  AuditLog,
  UserRole,
  PropertyType,
  ListingType,
  PropertyStatus,
  TransactionStatus,
  NotificationType,
  NotificationStatus,
} from '@prisma/client';

// Re-export all Prisma types
export type {
  User,
  UserProfile,
  UserPreferences,
  UserVerification,
  Property,
  PropertyAddress,
  PropertyLocation,
  PropertyFeatures,
  PropertyAmenity,
  PropertyImage,
  PropertyDocument,
  Transaction,
  TransactionDocument,
  SavedSearch,
  PropertyFavorite,
  Message,
  Notification,
  Review,
  AuditLog,
  UserRole,
  PropertyType,
  ListingType,
  PropertyStatus,
  TransactionStatus,
  NotificationType,
  NotificationStatus,
};

// Extended types for API responses
export interface UserWithProfile extends User {
  profile?: UserProfile | null;
  preferences?: UserPreferences | null;
  verification?: UserVerification | null;
}

export interface PropertyWithDetails extends Property {
  address?: PropertyAddress | null;
  location?: PropertyLocation | null;
  features?: PropertyFeatures | null;
  amenities: PropertyAmenity[];
  images: PropertyImage[];
  documents: PropertyDocument[];
  owner: User;
}

export interface TransactionWithDetails extends Transaction {
  property: PropertyWithDetails;
  buyer: UserWithProfile;
  documents: TransactionDocument[];
  messages: Message[];
}

// Search and filter types
export interface PropertySearchFilters {
  propertyType?: PropertyType[];
  listingType?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minFloorArea?: number;
  maxFloorArea?: number;
  country?: string;
  city?: string;
  features?: {
    garden?: boolean;
    parking?: boolean;
    furnished?: boolean;
    petFriendly?: boolean;
    balcony?: boolean;
    terrace?: boolean;
    elevator?: boolean;
    airConditioning?: boolean;
  };
  amenities?: string[];
}

export interface PropertySearchResult {
  properties: PropertyWithDetails[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Database operation result types
export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}