import { Router } from 'express';
import Joi from 'joi';
import { prisma } from '@eu-real-estate/database';
import { AuthService } from '../services/auth.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validateRequest } from '../middleware/validation';
import { authRateLimiter, loginRateLimiter } from '../middleware/rate-limiter';

const router = Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  phone: Joi.string().optional(),
  role: Joi.string().valid('BUYER', 'SELLER', 'AGENT').optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().required(),
});

const requestPasswordResetSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authRateLimiter, validateRequest(registerSchema), asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body);
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email to verify your account.',
    data: {
      user: result.user,
      tokens: result.tokens,
    },
  });
}));

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', loginRateLimiter, validateRequest(loginSchema), asyncHandler(async (req, res) => {
  const result = await AuthService.login(req.body);
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: result.user,
      tokens: result.tokens,
    },
  });
}));

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', authRateLimiter, validateRequest(refreshTokenSchema), asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await AuthService.refreshToken(refreshToken);
  
  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: { tokens },
  });
}));

/**
 * POST /api/auth/verify-email
 * Verify email address
 */
router.post('/verify-email', authRateLimiter, validateRequest(verifyEmailSchema), asyncHandler(async (req, res) => {
  const { token } = req.body;
  await AuthService.verifyEmail(token);
  
  res.json({
    success: true,
    message: 'Email verified successfully',
  });
}));

/**
 * POST /api/auth/request-password-reset
 * Request password reset
 */
router.post('/request-password-reset', authRateLimiter, validateRequest(requestPasswordResetSchema), asyncHandler(async (req, res) => {
  const { email } = req.body;
  await AuthService.requestPasswordReset(email);
  
  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
}));

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', authRateLimiter, validateRequest(resetPasswordSchema), asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  await AuthService.resetPassword(token, password);
  
  res.json({
    success: true,
    message: 'Password reset successfully',
  });
}));

/**
 * POST /api/auth/change-password
 * Change password (authenticated)
 */
router.post('/change-password', authenticate, validateRequest(changePasswordSchema), asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
  
  res.json({
    success: true,
    message: 'Password changed successfully',
  });
}));

/**
 * POST /api/auth/logout
 * Logout user (blacklist tokens)
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader!.substring(7); // Remove 'Bearer ' prefix
  
  // Get refresh token from request body (optional)
  const { refreshToken } = req.body;
  
  // Blacklist tokens
  await AuthService.logout(token, refreshToken);
  
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}));

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isVerified: true,
      createdAt: true,
      profile: true,
      preferences: true,
    },
  });
  
  res.json({
    success: true,
    data: { user },
  });
}));

export { router as authRoutes };