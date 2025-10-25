import { User, UserRole } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { DatabaseResult, UserWithProfile } from '../types';

/**
 * User repository for user-related database operations
 */
export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('user');
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<DatabaseResult<User>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      return {
        success: !!user,
        data: user as User,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to find user by email',
      };
    }
  }

  /**
   * Find a user with profile information
   */
  async findWithProfile(id: string): Promise<DatabaseResult<UserWithProfile>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          profile: true,
          preferences: true,
          verification: true,
        },
      });

      return {
        success: !!user,
        data: user as UserWithProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to find user with profile',
      };
    }
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole): Promise<DatabaseResult<User[]>> {
    try {
      const users = await this.prisma.user.findMany({
        where: { role },
      });

      return {
        success: true,
        data: users,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to find users by role',
      };
    }
  }

  /**
   * Update user verification status
   */
  async updateVerificationStatus(id: string, isVerified: boolean): Promise<DatabaseResult<User>> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { isVerified },
      });

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update user verification status',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    profileData: any
  ): Promise<DatabaseResult<UserWithProfile>> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          profile: {
            upsert: {
              create: profileData,
              update: profileData,
            },
          },
        },
        include: {
          profile: true,
          preferences: true,
          verification: true,
        },
      });

      return {
        success: true,
        data: user as UserWithProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update user profile',
      };
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferencesData: any
  ): Promise<DatabaseResult<UserWithProfile>> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          preferences: {
            upsert: {
              create: preferencesData,
              update: preferencesData,
            },
          },
        },
        include: {
          profile: true,
          preferences: true,
          verification: true,
        },
      });

      return {
        success: true,
        data: user as UserWithProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update user preferences',
      };
    }
  }

  /**
   * Create a new user with profile and preferences
   */
  async createWithProfile(userData: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    profile?: any;
    preferences?: any;
  }): Promise<DatabaseResult<UserWithProfile>> {
    try {
      const { profile, preferences, ...userInfo } = userData;

      const user = await this.prisma.user.create({
        data: {
          ...userInfo,
          profile: profile ? { create: profile } : undefined,
          preferences: preferences ? { create: preferences } : undefined,
          verification: { create: {} },
        },
        include: {
          profile: true,
          preferences: true,
          verification: true,
        },
      });

      return {
        success: true,
        data: user as UserWithProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create user with profile',
      };
    }
  }

  /**
   * Get user favorites
   */
  async getFavorites(userId: string): Promise<DatabaseResult<any[]>> {
    try {
      const favorites = await this.prisma.propertyFavorite.findMany({
        where: { userId },
        include: {
          property: {
            include: {
              address: true,
              images: {
                where: { isMain: true },
                take: 1,
              },
              features: true,
            },
          },
        },
      });

      return {
        success: true,
        data: favorites.map((fav) => ({
          ...fav.property,
          favoriteId: fav.id,
          favoriteCreatedAt: fav.createdAt,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get user favorites',
      };
    }
  }

  /**
   * Get user saved searches
   */
  async getSavedSearches(userId: string): Promise<DatabaseResult<any[]>> {
    try {
      const savedSearches = await this.prisma.savedSearch.findMany({
        where: { userId },
      });

      return {
        success: true,
        data: savedSearches,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get user saved searches',
      };
    }
  }
}