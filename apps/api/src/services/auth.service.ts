import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@eu-real-estate/database';
import { UserRole } from '@eu-real-estate/database';
import { AppError } from '../middleware/error-handler';
import { EmailService } from './email.service';
import { TokenService } from './token.service';
import { logger } from '../utils/logger';
import { PasswordValidator } from '../utils/password-validator';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isVerified: boolean;
  profile?: any;
  preferences?: any;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET!;
  private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
    }

    // Validate password strength
    const passwordValidation = PasswordValidator.validate(data.password);
    if (!passwordValidation.isValid) {
      throw new AppError(passwordValidation.message!, 400, 'WEAK_PASSWORD');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user with related records
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role || UserRole.BUYER,
        profile: {
          create: {
            languages: ['en'],
          },
        },
        preferences: {
          create: {
            currency: 'EUR',
            language: 'en',
            emailNotifications: true,
            pushNotifications: true,
          },
        },
        verification: {
          create: {
            emailVerified: false,
            phoneVerified: false,
            identityVerified: false,
            verificationToken: crypto.randomBytes(32).toString('hex'),
            tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        },
      },
      include: {
        profile: true,
        preferences: true,
        verification: true,
      },
    });

    // Send verification email
    await EmailService.sendVerificationEmail(user.email, user.verification!.verificationToken!);

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  /**
   * Login user
   */
  static async login(data: LoginData): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    // Find user with password
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        profile: true,
        preferences: true,
        verification: true,
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token using TokenService
      const userId = await TokenService.verifyRefreshToken(refreshToken);
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          isVerified: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      return this.generateTokens(user);
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
  }

  /**
   * Logout user by blacklisting tokens
   */
  static async logout(accessToken: string, refreshToken?: string): Promise<boolean> {
    try {
      // Blacklist access token
      await TokenService.blacklistToken(accessToken);
      
      // Blacklist refresh token if provided
      if (refreshToken) {
        await TokenService.blacklistToken(refreshToken);
      }
      
      return true;
    } catch (error) {
      logger.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(token: string): Promise<void> {
    const verification = await prisma.userVerification.findFirst({
      where: {
        verificationToken: token,
        tokenExpiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verification) {
      throw new AppError('Invalid or expired verification token', 400, 'INVALID_VERIFICATION_TOKEN');
    }

    await prisma.userVerification.update({
      where: { id: verification.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        tokenExpiresAt: null,
      },
    });

    await prisma.user.update({
      where: { id: verification.userId },
      data: { isVerified: true },
    });

    // Send welcome email
    await EmailService.sendWelcomeEmail(verification.user.email, verification.user.firstName);
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { verification: true },
    });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.userVerification.update({
      where: { userId: user.id },
      data: {
        verificationToken: resetToken,
        tokenExpiresAt,
      },
    });

    await EmailService.sendPasswordResetEmail(user.email, resetToken);
  }

  /**
   * Reset password
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password strength
    const passwordValidation = PasswordValidator.validate(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError(passwordValidation.message!, 400, 'WEAK_PASSWORD');
    }

    const verification = await prisma.userVerification.findFirst({
      where: {
        verificationToken: token,
        tokenExpiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: verification.userId },
      data: { passwordHash },
    });

    await prisma.userVerification.update({
      where: { id: verification.id },
      data: {
        verificationToken: null,
        tokenExpiresAt: null,
      },
    });
  }

  /**
   * Change password
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Validate password strength
    const passwordValidation = PasswordValidator.validate(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError(passwordValidation.message!, 400, 'WEAK_PASSWORD');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /**
   * Generate JWT tokens
   */
  private static generateTokens(user: any): AuthTokens {
    return TokenService.generateTokens(user);
  }

  /**
   * Format user for response
   */
  private static formatUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
      profile: user.profile,
      preferences: user.preferences,
    };
  }
}