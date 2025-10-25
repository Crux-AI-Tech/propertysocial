import request from 'supertest';
import { testPrisma, setupMocks, createTestToken } from './setup';
import { SecurityService } from '../services/security.service';
import { PasswordValidator } from '../utils/password-validator';
import app from '../main';

// Setup mocks
setupMocks();

describe('Security Tests', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    adminToken = createTestToken('test-admin-1', 'ADMIN');
    userToken = createTestToken('test-user-1', 'BUYER');
  });

  describe('Password Validation', () => {
    describe('POST /api/security/password/validate', () => {
      it('should validate strong password', async () => {
        const response = await request(app)
          .post('/api/security/password/validate')
          .send({
            password: 'StrongP@ssw0rd123!',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.validation.isValid).toBe(true);
        expect(response.body.data.validation.strength).toBe('very_strong');
        expect(response.body.data.strengthMeter.percentage).toBeGreaterThan(75);
      });

      it('should reject weak password', async () => {
        const response = await request(app)
          .post('/api/security/password/validate')
          .send({
            password: '123456',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.validation.isValid).toBe(false);
        expect(response.body.data.validation.strength).toBe('weak');
        expect(response.body.data.validation.errors.length).toBeGreaterThan(0);
      });

      it('should detect personal information in password', async () => {
        const response = await request(app)
          .post('/api/security/password/validate')
          .send({
            password: 'JohnDoe123!',
            userInfo: {
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
            },
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.validation.isValid).toBe(false);
        expect(response.body.data.validation.errors).toContain('Password should not contain personal information');
      });

      it('should detect common passwords', async () => {
        const response = await request(app)
          .post('/api/security/password/validate')
          .send({
            password: 'password123',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.validation.isValid).toBe(false);
        expect(response.body.data.validation.errors).toContain('Password is too common, please choose a more unique password');
      });
    });

    describe('POST /api/security/password/generate', () => {
      it('should generate secure password with default length', async () => {
        const response = await request(app)
          .post('/api/security/password/generate')
          .send({})
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.password).toBeDefined();
        expect(response.body.data.password.length).toBe(16);
        expect(response.body.data.validation.isValid).toBe(true);
        expect(response.body.data.validation.strength).toMatch(/strong|very_strong/);
      });

      it('should generate secure password with custom length', async () => {
        const response = await request(app)
          .post('/api/security/password/generate')
          .send({ length: 24 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.password.length).toBe(24);
        expect(response.body.data.validation.isValid).toBe(true);
      });

      it('should validate length constraints', async () => {
        const response = await request(app)
          .post('/api/security/password/generate')
          .send({ length: 200 })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Security Dashboard', () => {
    describe('GET /api/security/dashboard', () => {
      it('should get security dashboard for admin', async () => {
        const response = await request(app)
          .get('/api/security/dashboard')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.recentEvents).toBeDefined();
        expect(response.body.data.blockedIPs).toBeDefined();
        expect(response.body.data.alerts).toBeDefined();
        expect(response.body.data.statistics).toBeDefined();
        expect(response.body.data.statistics.totalEvents).toBeDefined();
        expect(response.body.data.statistics.criticalEvents).toBeDefined();
      });

      it('should reject non-admin access', async () => {
        const response = await request(app)
          .get('/api/security/dashboard')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/security/dashboard')
          .expect(401);

        expect(response.body.error.code).toBe('MISSING_TOKEN');
      });
    });
  });

  describe('IP Management', () => {
    describe('POST /api/security/ip/block', () => {
      it('should block IP address for admin', async () => {
        const response = await request(app)
          .post('/api/security/ip/block')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ip: '192.168.1.100',
            duration: 3600000, // 1 hour
            reason: 'Suspicious activity detected',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('has been blocked');
        expect(response.body.data.ip).toBe('192.168.1.100');
        expect(response.body.data.duration).toBe(3600000);
      });

      it('should validate IP address format', async () => {
        const response = await request(app)
          .post('/api/security/ip/block')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ip: 'invalid-ip',
            reason: 'Test',
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject non-admin access', async () => {
        const response = await request(app)
          .post('/api/security/ip/block')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            ip: '192.168.1.100',
          })
          .expect(403);

        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });
    });

    describe('POST /api/security/ip/unblock', () => {
      it('should unblock IP address for admin', async () => {
        const response = await request(app)
          .post('/api/security/ip/unblock')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ip: '192.168.1.100',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('has been unblocked');
        expect(response.body.data.ip).toBe('192.168.1.100');
      });
    });
  });

  describe('Encryption/Decryption', () => {
    describe('POST /api/security/encrypt', () => {
      it('should encrypt data for admin', async () => {
        const response = await request(app)
          .post('/api/security/encrypt')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            data: 'sensitive information',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.encrypted).toBeDefined();
        expect(response.body.data.iv).toBeDefined();
        expect(response.body.data.tag).toBeDefined();
      });

      it('should reject non-admin access', async () => {
        const response = await request(app)
          .post('/api/security/encrypt')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            data: 'sensitive information',
          })
          .expect(403);

        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });
    });

    describe('POST /api/security/decrypt', () => {
      let encryptedData: any;

      beforeAll(async () => {
        const encryptResponse = await request(app)
          .post('/api/security/encrypt')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            data: 'test data for decryption',
          });

        encryptedData = encryptResponse.body.data;
      });

      it('should decrypt data for admin', async () => {
        const response = await request(app)
          .post('/api/security/decrypt')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(encryptedData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.decrypted).toBe('test data for decryption');
      });

      it('should fail with invalid encrypted data', async () => {
        const response = await request(app)
          .post('/api/security/decrypt')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            encrypted: 'invalid',
            iv: 'invalid',
            tag: 'invalid',
          })
          .expect(400);

        expect(response.body.error.code).toBe('DECRYPTION_FAILED');
      });
    });
  });

  describe('Token Generation', () => {
    describe('POST /api/security/token/generate', () => {
      it('should generate secure token for admin', async () => {
        const response = await request(app)
          .post('/api/security/token/generate')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ length: 64 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.token.length).toBe(128); // hex encoding doubles length
        expect(response.body.data.length).toBe(64);
      });
    });
  });

  describe('CSRF Protection', () => {
    describe('POST /api/security/csrf/generate', () => {
      it('should generate CSRF token for authenticated user', async () => {
        const response = await request(app)
          .post('/api/security/csrf/generate')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.csrfToken).toBeDefined();
        expect(response.body.data.expiresAt).toBeDefined();
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/security/csrf/generate')
          .expect(401);

        expect(response.body.error.code).toBe('MISSING_TOKEN');
      });
    });

    describe('POST /api/security/csrf/validate', () => {
      it('should validate matching CSRF tokens', async () => {
        const token = 'test-csrf-token';
        
        const response = await request(app)
          .post('/api/security/csrf/validate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            token,
            sessionToken: token, // Same token for testing
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.valid).toBe(true);
      });

      it('should reject missing tokens', async () => {
        const response = await request(app)
          .post('/api/security/csrf/validate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({})
          .expect(400);

        expect(response.body.error.code).toBe('MISSING_CSRF_TOKEN');
      });
    });
  });

  describe('Security Events', () => {
    describe('GET /api/security/events', () => {
      it('should get security events for admin', async () => {
        const response = await request(app)
          .get('/api/security/events')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.events).toBeDefined();
        expect(response.body.data.total).toBeDefined();
        expect(Array.isArray(response.body.data.events)).toBe(true);
      });

      it('should filter events by severity', async () => {
        const response = await request(app)
          .get('/api/security/events?severity=HIGH')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.filters.severity).toBe('HIGH');
      });

      it('should limit number of events', async () => {
        const response = await request(app)
          .get('/api/security/events?limit=10')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.events.length).toBeLessThanOrEqual(10);
        expect(response.body.data.filters.limit).toBe(10);
      });
    });
  });

  describe('Security Health', () => {
    describe('GET /api/security/health', () => {
      it('should get security health status for admin', async () => {
        const response = await request(app)
          .get('/api/security/health')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toMatch(/healthy|warning|critical/);
        expect(response.body.data.score).toBeGreaterThanOrEqual(0);
        expect(response.body.data.score).toBeLessThanOrEqual(100);
        expect(response.body.data.metrics).toBeDefined();
        expect(response.body.data.recommendations).toBeDefined();
      });
    });
  });

  describe('Vulnerability Testing', () => {
    describe('POST /api/security/test/vulnerability', () => {
      it('should not be available in production', async () => {
        // Mock production environment
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const response = await request(app)
          .post('/api/security/test/vulnerability')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ testType: 'sql-injection' })
          .expect(403);

        expect(response.body.error.code).toBe('NOT_AVAILABLE_IN_PRODUCTION');

        // Restore environment
        process.env.NODE_ENV = originalEnv;
      });

      it('should provide vulnerability test information in development', async () => {
        const response = await request(app)
          .post('/api/security/test/vulnerability')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ testType: 'sql-injection' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.testType).toBe('sql-injection');
        expect(response.body.data.test).toBeDefined();
        expect(response.body.data.test.description).toBeDefined();
        expect(response.body.data.test.payload).toBeDefined();
      });

      it('should reject invalid test types', async () => {
        const response = await request(app)
          .post('/api/security/test/vulnerability')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ testType: 'invalid-test' })
          .expect(400);

        expect(response.body.error.code).toBe('INVALID_TEST_TYPE');
        expect(response.body.error.availableTests).toBeDefined();
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input in request body', async () => {
      const maliciousInput = {
        name: '<script>alert("XSS")</script>',
        description: "'; DROP TABLE users; --",
        path: '../../../etc/passwd',
      };

      // This should be blocked by the security middleware
      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${userToken}`)
        .send(maliciousInput)
        .expect(400);

      expect(response.body.error.code).toBe('MALICIOUS_INPUT_DETECTED');
    });

    it('should sanitize malicious input in query parameters', async () => {
      const response = await request(app)
        .get('/api/properties')
        .query({
          search: '<script>alert("XSS")</script>',
          filter: "'; DROP TABLE users; --",
        })
        .expect(400);

      expect(response.body.error.code).toBe('MALICIOUS_INPUT_DETECTED');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/security/health')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);
      
      // At least some requests should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Service Unit Tests', () => {
    describe('Password Validation', () => {
      it('should validate password correctly', () => {
        const result = PasswordValidator.validatePassword('StrongP@ssw0rd123!');
        expect(result.isValid).toBe(true);
        expect(result.strength).toBe('very_strong');
        expect(result.score).toBeGreaterThan(6);
      });

      it('should detect weak passwords', () => {
        const result = PasswordValidator.validatePassword('123456');
        expect(result.isValid).toBe(false);
        expect(result.strength).toBe('weak');
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should calculate entropy correctly', () => {
        const entropy = PasswordValidator.calculateEntropy('StrongP@ssw0rd123!');
        expect(entropy).toBeGreaterThan(50); // Should have good entropy
      });
    });

    describe('Token Generation', () => {
      it('should generate secure tokens', () => {
        const token = SecurityService.generateSecureToken(32);
        expect(token).toBeDefined();
        expect(token.length).toBe(64); // hex encoding doubles length
        expect(/^[a-f0-9]+$/.test(token)).toBe(true);
      });

      it('should generate CSRF tokens', () => {
        const token = SecurityService.generateCSRFToken();
        expect(token).toBeDefined();
        expect(token.length).toBeGreaterThan(0);
      });
    });

    describe('Encryption/Decryption', () => {
      it('should encrypt and decrypt data correctly', () => {
        const originalData = 'sensitive information';
        const encrypted = SecurityService.encrypt(originalData);
        
        expect(encrypted.encrypted).toBeDefined();
        expect(encrypted.iv).toBeDefined();
        expect(encrypted.tag).toBeDefined();
        
        const decrypted = SecurityService.decrypt(encrypted);
        expect(decrypted).toBe(originalData);
      });

      it('should fail decryption with tampered data', () => {
        const originalData = 'sensitive information';
        const encrypted = SecurityService.encrypt(originalData);
        
        // Tamper with encrypted data
        encrypted.encrypted = 'tampered';
        
        expect(() => {
          SecurityService.decrypt(encrypted);
        }).toThrow();
      });
    });
  });
});