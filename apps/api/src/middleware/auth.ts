import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@eu-real-estate/database';
import { UserRole } from '@eu-real-estate/database';
import { AppError } from './error-handler';
import { TokenService } from '../services/token.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
  };
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication token required', 401, 'MISSING_TOKEN');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      throw new AppError('JWT secret not configured', 500, 'CONFIG_ERROR');
    }

    // Verify JWT token using TokenService
    const decoded = await TokenService.verifyToken(token);
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid authentication token', 401, 'INVALID_TOKEN'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED'));
    } else {
      next(error);
    }
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS'));
    }

    next();
  };
};

/**
 * Middleware to check if user is verified
 */
export const requireVerification = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'));
  }

  if (!req.user.isVerified) {
    return next(new AppError('Account verification required', 403, 'VERIFICATION_REQUIRED'));
  }

  next();
};

/**
 * Middleware to check if user owns resource or has admin role
 */
export const requireOwnershipOrAdmin = (userIdField: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'));
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    
    if (req.user.role === UserRole.ADMIN || req.user.id === resourceUserId) {
      return next();
    }

    next(new AppError('Access denied', 403, 'ACCESS_DENIED'));
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      return next();
    }

    const decoded = await TokenService.verifyToken(token);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        isActive: true,
      },
    });

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      };
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};