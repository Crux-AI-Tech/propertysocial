import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@eu-real-estate/database';
import { UserRole } from '@eu-real-estate/database';
import { TokenService } from '../services/token.service';
import app from '../main';

// Mock email service
jest.mock('../services/email.service', () => ({
  EmailService: {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  },
}));

// Mock token service
jest.mock('../services/token.service', () => ({
  TokenService: {
    generateTokens: jest.fn().mockImplementation((user) => ({
      accessToken: `mock-access-token-${user.id}`,
      refreshToken: `mock-refresh-token-${user.id}`,
      expiresIn: 3600,
    })),
    verifyToken: jest.fn().mockImplementation((token) => {
      if (token === 'invalid-token') {
        throw new Error('Invalid token');
      }
      if (token === 'expired-token') {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      }
      if (token.startsWith('mock-access-token-')) {
        const userId = token.replace('mock-access-token-', '');
        return {
          userId,
          email: `user-${userId}@example.com`,
          role: 'BUYER',
          isVerified: true,
        };
      }
      throw new Error('Invalid token');
    }),
    verifyRefreshToken: jest.fn().mockImplementation((token) => {
      if (token === 'invalid-token') {
        throw new Error('Invalid token');
      }
      if (token.startsWith('mock-refresh-token-')) {
        return token.replace('mock-refresh-token-', '');
      }
      throw new Error('Invalid token');
    }),
    blacklistToken: jest.fn().mockResolvedValue(true),
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  },
}));

describe('Authentication API', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.userVerification.deleteMany();
    await prisma.userPreferences.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.user.deleteMany();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      role: 'BUYER',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: validRegistrationData.email,
        firstName: validRegistrationData.firstName,
        lastName: validRegistrationData.lastName,
        role: validRegistrationData.role,
        isVerified: false,
      });
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, email: 'invalid-email' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, password: '123' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, password: 'password123' })
        .expect(400);

      expect(response.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('should reject registration with existing email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body.error.code).toBe('USER_EXISTS');
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    beforeEach(async () => {
      // Create test user
      await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash: await bcrypt.hash(userData.password, 12),
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: UserRole.BUYER,
          isActive: true,
          profile: { create: {} },
          preferences: { create: {} },
          verification: { create: {} },
        },
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userData.password,
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for inactive user', async () => {
      // Deactivate user
      await prisma.user.update({
        where: { email: userData.email },
        data: { isActive: false },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(401);

      expect(response.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let userId: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Create test user and get refresh token
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: await bcrypt.hash('Password123!', 12),
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.BUYER,
          profile: { create: {} },
          preferences: { create: {} },
          verification: { create: {} },
        },
      });

      userId = user.id;
      refreshToken = `mock-refresh-token-${userId}`;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(TokenService.verifyRefreshToken).toHaveBeenCalledWith(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('GET /api/auth/me', () => {
    let userId: string;
    let accessToken: string;

    beforeEach(async () => {
      // Create test user and get access token
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: await bcrypt.hash('Password123!', 12),
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.BUYER,
          profile: { create: {} },
          preferences: { create: {} },
          verification: { create: {} },
        },
      });

      userId = user.id;
      accessToken = `mock-access-token-${userId}`;
    });

    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(userId);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    let userId: string;
    let verificationToken: string;

    beforeEach(async () => {
      verificationToken = 'test-verification-token';
      
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: await bcrypt.hash('Password123!', 12),
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.BUYER,
          profile: { create: {} },
          preferences: { create: {} },
          verification: {
            create: {
              verificationToken,
              tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          },
        },
      });

      userId = user.id;
    });

    it('should verify email successfully', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Email verified successfully');

      // Check that user is now verified
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { verification: true },
      });

      expect(user?.isVerified).toBe(true);
      expect(user?.verification?.emailVerified).toBe(true);
      expect(user?.verification?.verificationToken).toBeNull();
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });
  });

  describe('POST /api/auth/change-password', () => {
    let userId: string;
    let accessToken: string;
    const currentPassword = 'Password123!';
    const newPassword = 'NewPassword456!';

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: await bcrypt.hash(currentPassword, 12),
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.BUYER,
          profile: { create: {} },
          preferences: { create: {} },
          verification: { create: {} },
        },
      });

      userId = user.id;
      accessToken = `mock-access-token-${userId}`;
    });

    it('should change password successfully', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');

      // Verify new password works
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      const passwordValid = await bcrypt.compare(newPassword, user!.passwordHash);
      expect(passwordValid).toBe(true);
    });

    it('should reject with incorrect current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword,
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('should reject with weak new password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword: 'password',
        })
        .expect(400);

      expect(response.body.error.code).toBe('WEAK_PASSWORD');
    });
  });

  describe('POST /api/auth/logout', () => {
    let userId: string;
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: await bcrypt.hash('Password123!', 12),
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.BUYER,
          profile: { create: {} },
          preferences: { create: {} },
          verification: { create: {} },
        },
      });

      userId = user.id;
      accessToken = `mock-access-token-${userId}`;
      refreshToken = `mock-refresh-token-${userId}`;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
      expect(TokenService.blacklistToken).toHaveBeenCalledWith(accessToken, refreshToken);
    });

    it('should logout with only access token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(TokenService.blacklistToken).toHaveBeenCalledWith(accessToken, undefined);
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('POST /api/auth/request-password-reset', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: await bcrypt.hash('Password123!', 12),
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.BUYER,
          profile: { create: {} },
          preferences: { create: {} },
          verification: { create: {} },
        },
      });
    });

    it('should request password reset successfully', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let userId: string;
    let resetToken: string;

    beforeEach(async () => {
      resetToken = 'test-reset-token';
      
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: await bcrypt.hash('Password123!', 12),
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.BUYER,
          profile: { create: {} },
          preferences: { create: {} },
          verification: {
            create: {
              verificationToken: resetToken,
              tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          },
        },
      });

      userId = user.id;
    });

    it('should reset password successfully', async () => {
      const newPassword = 'NewPassword456!';
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset successfully');

      // Verify new password works
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      const passwordValid = await bcrypt.compare(newPassword, user!.passwordHash);
      expect(passwordValid).toBe(true);
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword456!',
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_RESET_TOKEN');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'password',
        })
        .expect(400);

      expect(response.body.error.code).toBe('WEAK_PASSWORD');
    });
  });

  describe('Authorization middleware', () => {
    let buyerToken: string;
    let sellerToken: string;
    let adminToken: string;

    beforeEach(async () => {
      // Create users with different roles
      const buyer = await prisma.user.create({
        data: {
          email: 'buyer@example.com',
          passwordHash: await bcrypt.hash('Password123!', 12),
          firstName: 'Buyer',
          lastName: 'User',
          role: UserRole.BUYER,
          profile: { create: {} },
          preferences: { create: {} },
          verification: { create: {} },
        },
      });

      const seller = await prisma.user.create({
        data: {
          email: 'seller@example.com',
          passwordHash: await bcrypt.hash('Password123!', 12),
          firstName: 'Seller',
          lastName: 'User',
          role: UserRole.SELLER,
          profile: { create: {} },
          preferences: { create: {} },
          verification: { create: {} },
        },
      });

      const admin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          passwordHash: await bcrypt.hash('Password123!', 12),
          firstName: 'Admin',
          lastName: 'User',
          role: UserRole.ADMIN,
          profile: { create: {} },
          preferences: { create: {} },
          verification: { create: {} },
        },
      });

      buyerToken = `mock-access-token-${buyer.id}`;
      sellerToken = `mock-access-token-${seller.id}`;
      adminToken = `mock-access-token-${admin.id}`;

      // Mock TokenService.verifyToken to return different roles
      (TokenService.verifyToken as jest.Mock).mockImplementation((token) => {
        if (token === buyerToken) {
          return { userId: buyer.id, email: buyer.email, role: UserRole.BUYER, isVerified: true };
        }
        if (token === sellerToken) {
          return { userId: seller.id, email: seller.email, role: UserRole.SELLER, isVerified: true };
        }
        if (token === adminToken) {
          return { userId: admin.id, email: admin.email, role: UserRole.ADMIN, isVerified: true };
        }
        throw new Error('Invalid token');
      });
    });

    // This test assumes you have a route that requires ADMIN role
    it('should allow access to admin-only routes for admin users', async () => {
      // Create a test route that requires admin role
      // This would typically be tested against an actual admin-only route
      
      // For this test, we'll use the /api/users route which typically requires admin access
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access to admin-only routes for non-admin users', async () => {
      // For this test, we'll use the /api/users route which typically requires admin access
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});