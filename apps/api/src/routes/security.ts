import { Router } from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validateRequest } from '../middleware/validation';
import { SecurityService } from '../services/security.service';
import { PasswordValidator } from '../utils/password-validator';
import { UserRole } from '@eu-real-estate/database';

const router = Router();

// Validation schemas
const passwordValidationSchema = Joi.object({
  password: Joi.string().required(),
  userInfo: Joi.object({
    email: Joi.string().email().optional(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
  }).optional(),
});

const generatePasswordSchema = Joi.object({
  length: Joi.number().min(8).max(128).default(16),
});

const blockIpSchema = Joi.object({
  ip: Joi.string().ip().required(),
  duration: Joi.number().positive().optional(),
  reason: Joi.string().optional(),
});

const unblockIpSchema = Joi.object({
  ip: Joi.string().ip().required(),
});

const encryptDataSchema = Joi.object({
  data: Joi.string().required(),
});

const decryptDataSchema = Joi.object({
  encrypted: Joi.string().required(),
  iv: Joi.string().required(),
  tag: Joi.string().required(),
});

/**
 * POST /api/security/password/validate
 * Validate password strength
 */
router.post('/password/validate', 
  validateRequest(passwordValidationSchema),
  asyncHandler(async (req, res) => {
    const { password, userInfo } = req.body;
    
    const validation = PasswordValidator.validatePassword(password, userInfo);
    const strengthMeter = PasswordValidator.getPasswordStrengthMeter(password);
    const entropy = PasswordValidator.calculateEntropy(password);
    
    res.json({
      success: true,
      data: {
        validation,
        strengthMeter,
        entropy,
      },
    });
  })
);

/**
 * POST /api/security/password/generate
 * Generate secure password
 */
router.post('/password/generate',
  validateRequest(generatePasswordSchema),
  asyncHandler(async (req, res) => {
    const { length } = req.body;
    
    const password = PasswordValidator.generateSecurePassword(length);
    const validation = PasswordValidator.validatePassword(password);
    
    res.json({
      success: true,
      data: {
        password,
        validation,
      },
    });
  })
);

/**
 * GET /api/security/dashboard
 * Get security dashboard data (admin only)
 */
router.get('/dashboard',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const dashboardData = await SecurityService.getSecurityDashboard();
    
    res.json({
      success: true,
      data: dashboardData,
    });
  })
);

/**
 * POST /api/security/ip/block
 * Block IP address (admin only)
 */
router.post('/ip/block',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest(blockIpSchema),
  asyncHandler(async (req, res) => {
    const { ip, duration, reason } = req.body;
    
    SecurityService.blockIP(ip, duration);
    
    // Log the blocking action
    await SecurityService.logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      ip,
      endpoint: '/api/security/ip/block',
      timestamp: new Date(),
      severity: 'HIGH',
      userId: req.user?.id,
    });
    
    res.json({
      success: true,
      message: `IP ${ip} has been blocked${duration ? ` for ${duration}ms` : ' permanently'}`,
      data: {
        ip,
        duration,
        reason,
        blockedBy: req.user?.id,
        blockedAt: new Date(),
      },
    });
  })
);

/**
 * POST /api/security/ip/unblock
 * Unblock IP address (admin only)
 */
router.post('/ip/unblock',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest(unblockIpSchema),
  asyncHandler(async (req, res) => {
    const { ip } = req.body;
    
    SecurityService.unblockIP(ip);
    
    res.json({
      success: true,
      message: `IP ${ip} has been unblocked`,
      data: {
        ip,
        unblockedBy: req.user?.id,
        unblockedAt: new Date(),
      },
    });
  })
);

/**
 * POST /api/security/encrypt
 * Encrypt sensitive data (admin only)
 */
router.post('/encrypt',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest(encryptDataSchema),
  asyncHandler(async (req, res) => {
    const { data } = req.body;
    
    const encrypted = SecurityService.encrypt(data);
    
    res.json({
      success: true,
      data: {
        encrypted: encrypted.encrypted,
        iv: encrypted.iv,
        tag: encrypted.tag,
      },
    });
  })
);

/**
 * POST /api/security/decrypt
 * Decrypt sensitive data (admin only)
 */
router.post('/decrypt',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest(decryptDataSchema),
  asyncHandler(async (req, res) => {
    const { encrypted, iv, tag } = req.body;
    
    try {
      const decrypted = SecurityService.decrypt({ encrypted, iv, tag });
      
      res.json({
        success: true,
        data: {
          decrypted,
        },
      });
    } catch (error) {
      res.status(400).json({
        error: {
          code: 'DECRYPTION_FAILED',
          message: 'Failed to decrypt data',
        },
      });
    }
  })
);

/**
 * POST /api/security/token/generate
 * Generate secure token (admin only)
 */
router.post('/token/generate',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const { length = 32 } = req.body;
    
    const token = SecurityService.generateSecureToken(length);
    
    res.json({
      success: true,
      data: {
        token,
        length,
        generatedAt: new Date(),
      },
    });
  })
);

/**
 * POST /api/security/csrf/generate
 * Generate CSRF token
 */
router.post('/csrf/generate',
  authenticate,
  asyncHandler(async (req, res) => {
    const csrfToken = SecurityService.generateCSRFToken();
    
    // Store CSRF token in session or return it
    res.json({
      success: true,
      data: {
        csrfToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });
  })
);

/**
 * POST /api/security/csrf/validate
 * Validate CSRF token
 */
router.post('/csrf/validate',
  authenticate,
  asyncHandler(async (req, res) => {
    const { token, sessionToken } = req.body;
    
    if (!token || !sessionToken) {
      return res.status(400).json({
        error: {
          code: 'MISSING_CSRF_TOKEN',
          message: 'CSRF token and session token are required',
        },
      });
    }
    
    const isValid = SecurityService.validateCSRFToken(token, sessionToken);
    
    res.json({
      success: true,
      data: {
        valid: isValid,
      },
    });
  })
);

/**
 * GET /api/security/events
 * Get recent security events (admin only)
 */
router.get('/events',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const { limit = 50, severity, type } = req.query;
    
    const events = await SecurityService.getRecentSecurityEvents('all', 24 * 60 * 60 * 1000); // 24 hours
    
    let filteredEvents = events;
    
    if (severity) {
      filteredEvents = filteredEvents.filter(event => event.severity === severity);
    }
    
    if (type) {
      filteredEvents = filteredEvents.filter(event => event.type === type);
    }
    
    const limitedEvents = filteredEvents.slice(0, Number(limit));
    
    res.json({
      success: true,
      data: {
        events: limitedEvents,
        total: filteredEvents.length,
        filters: {
          severity,
          type,
          limit: Number(limit),
        },
      },
    });
  })
);

/**
 * GET /api/security/health
 * Get security health status
 */
router.get('/health',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const dashboardData = await SecurityService.getSecurityDashboard();
    
    // Calculate security health score
    const totalEvents = dashboardData.statistics.totalEvents;
    const criticalEvents = dashboardData.statistics.criticalEvents;
    const blockedIPs = dashboardData.statistics.blockedIPs;
    
    let healthScore = 100;
    
    // Deduct points for security issues
    if (criticalEvents > 0) {
      healthScore -= Math.min(50, criticalEvents * 10);
    }
    
    if (totalEvents > 100) {
      healthScore -= Math.min(30, (totalEvents - 100) * 0.1);
    }
    
    if (blockedIPs > 10) {
      healthScore -= Math.min(20, (blockedIPs - 10) * 2);
    }
    
    healthScore = Math.max(0, healthScore);
    
    let status: 'healthy' | 'warning' | 'critical';
    if (healthScore >= 80) {
      status = 'healthy';
    } else if (healthScore >= 60) {
      status = 'warning';
    } else {
      status = 'critical';
    }
    
    res.json({
      success: true,
      data: {
        status,
        score: healthScore,
        metrics: {
          totalEvents,
          criticalEvents,
          blockedIPs,
          recentAlerts: dashboardData.alerts.length,
        },
        recommendations: [
          ...(criticalEvents > 0 ? ['Review and address critical security events'] : []),
          ...(blockedIPs > 10 ? ['Investigate high number of blocked IPs'] : []),
          ...(totalEvents > 100 ? ['Monitor for unusual activity patterns'] : []),
        ],
      },
    });
  })
);

/**
 * POST /api/security/test/vulnerability
 * Test for common vulnerabilities (admin only, development/testing only)
 */
router.post('/test/vulnerability',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: {
          code: 'NOT_AVAILABLE_IN_PRODUCTION',
          message: 'Vulnerability testing is not available in production',
        },
      });
    }
    
    const { testType } = req.body;
    
    const vulnerabilityTests = {
      'sql-injection': {
        description: 'SQL Injection Test',
        payload: "'; DROP TABLE users; --",
        expected: 'Should be blocked by input sanitization',
      },
      'xss': {
        description: 'Cross-Site Scripting Test',
        payload: '<script>alert("XSS")</script>',
        expected: 'Should be sanitized and blocked',
      },
      'path-traversal': {
        description: 'Path Traversal Test',
        payload: '../../../etc/passwd',
        expected: 'Should be blocked by path validation',
      },
    };
    
    const test = vulnerabilityTests[testType as keyof typeof vulnerabilityTests];
    
    if (!test) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TEST_TYPE',
          message: 'Invalid vulnerability test type',
          availableTests: Object.keys(vulnerabilityTests),
        },
      });
    }
    
    res.json({
      success: true,
      data: {
        testType,
        test,
        warning: 'This endpoint is for testing purposes only and should not be used in production',
      },
    });
  })
);

export { router as securityRoutes };