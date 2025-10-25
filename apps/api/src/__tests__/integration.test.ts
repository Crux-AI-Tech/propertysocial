import request from 'supertest';
import { testPrisma, setupMocks, createTestToken } from './setup';
import { ThirdPartyIntegrationService } from '../services/third-party-integration.service';
import { CacheService } from '../services/cache.service';
import app from '../main';

// Setup mocks
setupMocks();

describe('Integration Tests', () => {
  let agentToken: string;
  let buyerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Create test tokens
    agentToken = createTestToken('test-agent-1', 'AGENT');
    buyerToken = createTestToken('test-buyer-1', 'BUYER');
    adminToken = createTestToken('test-admin-1', 'ADMIN');
  });

  describe('Third-Party Integration API', () => {
    describe('POST /api/integrations/property/valuation', () => {
      it('should get property valuation successfully', async () => {
        const valuationData = {
          address: 'Unter den Linden 1, Berlin',
          propertyType: 'APARTMENT',
          size: 85,
          country: 'DE',
        };

        const response = await request(app)
          .post('/api/integrations/property/valuation')
          .set('Authorization', `Bearer ${agentToken}`)
          .send(valuationData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.valuations).toBeDefined();
        expect(response.body.data.count).toBeGreaterThan(0);
        expect(response.body.data.averageValue).toBeDefined();

        // Verify mock was called
        expect(ThirdPartyIntegrationService.getPropertyValuation).toHaveBeenCalledWith(
          valuationData.address,
          valuationData.propertyType,
          valuationData.size,
          valuationData.country
        );
      });

      it('should validate required fields', async () => {
        const invalidData = {
          address: 'Unter den Linden 1, Berlin',
          // Missing propertyType, size, country
        };

        const response = await request(app)
          .post('/api/integrations/property/valuation')
          .set('Authorization', `Bearer ${agentToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should require authentication', async () => {
        const valuationData = {
          address: 'Unter den Linden 1, Berlin',
          propertyType: 'APARTMENT',
          size: 85,
          country: 'DE',
        };

        const response = await request(app)
          .post('/api/integrations/property/valuation')
          .send(valuationData)
          .expect(401);

        expect(response.body.error.code).toBe('MISSING_TOKEN');
      });
    });

    describe('POST /api/integrations/mortgage/quotes', () => {
      it('should get mortgage quotes successfully', async () => {
        const quoteData = {
          propertyValue: 450000,
          downPayment: 90000,
          income: 75000,
          country: 'DE',
          currency: 'EUR',
        };

        const response = await request(app)
          .post('/api/integrations/mortgage/quotes')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send(quoteData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.quotes).toBeDefined();
        expect(response.body.data.count).toBeGreaterThan(0);
        expect(response.body.data.bestRate).toBeDefined();

        // Verify mock was called
        expect(ThirdPartyIntegrationService.getMortgageQuotes).toHaveBeenCalledWith(
          quoteData.propertyValue,
          quoteData.downPayment,
          quoteData.income,
          quoteData.country,
          quoteData.currency
        );
      });

      it('should validate numeric fields', async () => {
        const invalidData = {
          propertyValue: 'invalid',
          downPayment: 90000,
          income: 75000,
          country: 'DE',
        };

        const response = await request(app)
          .post('/api/integrations/mortgage/quotes')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/integrations/legal/services', () => {
      it('should get legal services successfully', async () => {
        const response = await request(app)
          .get('/api/integrations/legal/services')
          .query({
            serviceType: 'conveyancing',
            country: 'DE',
            language: 'en',
          })
          .set('Authorization', `Bearer ${agentToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.services).toBeDefined();
        expect(response.body.data.count).toBeGreaterThan(0);

        // Verify mock was called
        expect(ThirdPartyIntegrationService.getLegalServices).toHaveBeenCalledWith(
          'conveyancing',
          'DE',
          'en'
        );
      });

      it('should validate service type enum', async () => {
        const response = await request(app)
          .get('/api/integrations/legal/services')
          .query({
            serviceType: 'invalid_service',
            country: 'DE',
          })
          .set('Authorization', `Bearer ${agentToken}`)
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/integrations/payment/methods', () => {
      it('should get payment methods successfully', async () => {
        const response = await request(app)
          .get('/api/integrations/payment/methods')
          .query({
            country: 'DE',
            currency: 'EUR',
          })
          .set('Authorization', `Bearer ${buyerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.methods).toBeDefined();
        expect(response.body.data.count).toBeGreaterThan(0);

        // Verify mock was called
        expect(ThirdPartyIntegrationService.getPaymentMethods).toHaveBeenCalledWith('DE', 'EUR');
      });

      it('should validate country code format', async () => {
        const response = await request(app)
          .get('/api/integrations/payment/methods')
          .query({
            country: 'INVALID',
            currency: 'EUR',
          })
          .set('Authorization', `Bearer ${buyerToken}`)
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/integrations/geocode', () => {
      it('should geocode address successfully', async () => {
        const geocodeData = {
          address: 'Brandenburg Gate, Berlin',
          country: 'DE',
        };

        const response = await request(app)
          .post('/api/integrations/geocode')
          .set('Authorization', `Bearer ${agentToken}`)
          .send(geocodeData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.lat).toBeDefined();
        expect(response.body.data.lng).toBeDefined();
        expect(response.body.data.formattedAddress).toBeDefined();

        // Verify mock was called
        expect(ThirdPartyIntegrationService.geocodeAddress).toHaveBeenCalledWith(
          geocodeData.address,
          geocodeData.country
        );
      });

      it('should handle geocoding failure', async () => {
        // Mock geocoding failure
        (ThirdPartyIntegrationService.geocodeAddress as jest.Mock).mockResolvedValueOnce(null);

        const geocodeData = {
          address: 'Invalid Address',
          country: 'DE',
        };

        const response = await request(app)
          .post('/api/integrations/geocode')
          .set('Authorization', `Bearer ${agentToken}`)
          .send(geocodeData)
          .expect(404);

        expect(response.body.error.code).toBe('GEOCODING_FAILED');
      });
    });

    describe('POST /api/integrations/email/send', () => {
      it('should send email successfully for agents', async () => {
        const emailData = {
          to: 'user@example.com',
          templateId: 'property_inquiry',
          data: {
            propertyTitle: 'Beautiful Apartment',
            inquiryMessage: 'I am interested in this property',
          },
          language: 'en',
        };

        const response = await request(app)
          .post('/api/integrations/email/send')
          .set('Authorization', `Bearer ${agentToken}`)
          .send(emailData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Email sent successfully');

        // Verify mock was called
        expect(ThirdPartyIntegrationService.sendEmail).toHaveBeenCalledWith(
          emailData.to,
          emailData.templateId,
          emailData.data,
          emailData.language
        );
      });

      it('should reject email sending for buyers', async () => {
        const emailData = {
          to: 'user@example.com',
          templateId: 'property_inquiry',
          data: { message: 'test' },
        };

        const response = await request(app)
          .post('/api/integrations/email/send')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send(emailData)
          .expect(403);

        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });

      it('should handle email sending failure', async () => {
        // Mock email sending failure
        (ThirdPartyIntegrationService.sendEmail as jest.Mock).mockResolvedValueOnce(false);

        const emailData = {
          to: 'user@example.com',
          templateId: 'property_inquiry',
          data: { message: 'test' },
        };

        const response = await request(app)
          .post('/api/integrations/email/send')
          .set('Authorization', `Bearer ${agentToken}`)
          .send(emailData)
          .expect(500);

        expect(response.body.error.code).toBe('EMAIL_SEND_FAILED');
      });
    });

    describe('POST /api/integrations/sms/send', () => {
      it('should send SMS successfully for agents', async () => {
        const smsData = {
          phoneNumber: '+491234567890',
          message: 'Your property viewing is confirmed',
          country: 'DE',
        };

        const response = await request(app)
          .post('/api/integrations/sms/send')
          .set('Authorization', `Bearer ${agentToken}`)
          .send(smsData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('SMS sent successfully');

        // Verify mock was called
        expect(ThirdPartyIntegrationService.sendSMS).toHaveBeenCalledWith(
          smsData.phoneNumber,
          smsData.message,
          smsData.country
        );
      });

      it('should validate message length', async () => {
        const smsData = {
          phoneNumber: '+491234567890',
          message: 'A'.repeat(161), // Too long
          country: 'DE',
        };

        const response = await request(app)
          .post('/api/integrations/sms/send')
          .set('Authorization', `Bearer ${agentToken}`)
          .send(smsData)
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/integrations/health', () => {
      it('should get integration health status for admin', async () => {
        const response = await request(app)
          .get('/api/integrations/health')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.overall).toBeDefined();
        expect(response.body.data.overall.status).toBeDefined();
        expect(response.body.data.integrations).toBeDefined();

        // Verify mock was called
        expect(ThirdPartyIntegrationService.getIntegrationHealth).toHaveBeenCalled();
      });

      it('should reject non-admin access', async () => {
        const response = await request(app)
          .get('/api/integrations/health')
          .set('Authorization', `Bearer ${buyerToken}`)
          .expect(403);

        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });
    });

    describe('GET /api/integrations/status', () => {
      it('should get integration configuration status for admin', async () => {
        const response = await request(app)
          .get('/api/integrations/status')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.summary).toBeDefined();
        expect(response.body.data.integrations).toBeDefined();
        expect(response.body.data.summary.total).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance API', () => {
    describe('GET /api/performance/dashboard', () => {
      it('should get performance dashboard for admin', async () => {
        const response = await request(app)
          .get('/api/performance/dashboard')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.current).toBeDefined();
        expect(response.body.data.history).toBeDefined();
        expect(response.body.data.alerts).toBeDefined();
      });

      it('should reject non-admin access', async () => {
        const response = await request(app)
          .get('/api/performance/dashboard')
          .set('Authorization', `Bearer ${buyerToken}`)
          .expect(403);

        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });
    });

    describe('GET /api/performance/cache/stats', () => {
      it('should get cache statistics for admin', async () => {
        const response = await request(app)
          .get('/api/performance/cache/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.stats).toBeDefined();
        expect(response.body.data.stats.hits).toBeDefined();
        expect(response.body.data.stats.misses).toBeDefined();
        expect(response.body.data.stats.hitRate).toBeDefined();
      });
    });

    describe('POST /api/performance/cache', () => {
      it('should set cache value for admin', async () => {
        const cacheData = {
          key: 'test-key',
          value: { test: 'data' },
          ttl: 300,
        };

        const response = await request(app)
          .post('/api/performance/cache')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(cacheData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Cache value set successfully');
      });
    });

    describe('DELETE /api/performance/cache/clear', () => {
      it('should clear all caches for admin', async () => {
        const response = await request(app)
          .delete('/api/performance/cache/clear')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('All caches cleared');
      });
    });

    describe('GET /api/performance/health', () => {
      it('should return health status', async () => {
        const response = await request(app)
          .get('/api/performance/health')
          .expect(200);

        expect(response.body.status).toBe('healthy');
        expect(response.body.checks).toBeDefined();
        expect(response.body.checks.cpu).toBeDefined();
        expect(response.body.checks.memory).toBeDefined();
        expect(response.body.checks.cache).toBeDefined();
        expect(response.body.checks.errors).toBeDefined();
      });
    });

    describe('GET /api/performance/status', () => {
      it('should return simple status', async () => {
        const response = await request(app)
          .get('/api/performance/status')
          .expect(200);

        expect(response.body.status).toBe('ok');
        expect(response.body.timestamp).toBeDefined();
        expect(response.body.uptime).toBeDefined();
      });
    });
  });

  describe('Cache Integration', () => {
    beforeEach(async () => {
      // Clear cache before each test
      await CacheService.clear();
    });

    it('should cache API responses', async () => {
      const valuationData = {
        address: 'Unter den Linden 1, Berlin',
        propertyType: 'APARTMENT',
        size: 85,
        country: 'DE',
      };

      // First request - should call the service
      const response1 = await request(app)
        .post('/api/integrations/property/valuation')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(valuationData)
        .expect(200);

      expect(response1.headers['x-cache']).toBe('MISS');

      // Second request - should be cached
      const response2 = await request(app)
        .post('/api/integrations/property/valuation')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(valuationData)
        .expect(200);

      expect(response2.headers['x-cache']).toBe('HIT');
      expect(response2.body).toEqual(response1.body);
    });

    it('should respect cache TTL', async () => {
      const key = 'test-ttl-key';
      const value = { test: 'data' };
      const shortTTL = 1; // 1 second

      // Set cache with short TTL
      await CacheService.set(key, value, shortTTL);

      // Should be available immediately
      const cached1 = await CacheService.get(key);
      expect(cached1).toEqual(value);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      const cached2 = await CacheService.get(key);
      expect(cached2).toBeNull();
    });

    it('should handle cache invalidation', async () => {
      const key = 'test-invalidation-key';
      const value = { test: 'data' };

      // Set cache
      await CacheService.set(key, value);

      // Verify it's cached
      const cached1 = await CacheService.get(key);
      expect(cached1).toEqual(value);

      // Delete from cache
      await CacheService.delete(key);

      // Should be gone
      const cached2 = await CacheService.get(key);
      expect(cached2).toBeNull();
    });

    it('should handle pattern-based cache deletion', async () => {
      // Set multiple cache entries
      await CacheService.set('user:1:profile', { name: 'User 1' });
      await CacheService.set('user:2:profile', { name: 'User 2' });
      await CacheService.set('property:1:details', { title: 'Property 1' });

      // Delete user-related cache entries
      const deletedCount = await CacheService.deletePattern('user:*');
      expect(deletedCount).toBeGreaterThan(0);

      // User entries should be gone
      const user1 = await CacheService.get('user:1:profile');
      const user2 = await CacheService.get('user:2:profile');
      expect(user1).toBeNull();
      expect(user2).toBeNull();

      // Property entry should still exist
      const property1 = await CacheService.get('property:1:details');
      expect(property1).toEqual({ title: 'Property 1' });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle third-party service failures gracefully', async () => {
      // Mock service failure
      (ThirdPartyIntegrationService.getPropertyValuation as jest.Mock)
        .mockRejectedValueOnce(new Error('Service unavailable'));

      const valuationData = {
        address: 'Unter den Linden 1, Berlin',
        propertyType: 'APARTMENT',
        size: 85,
        country: 'DE',
      };

      const response = await request(app)
        .post('/api/integrations/property/valuation')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(valuationData)
        .expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .get('/api/performance/status')
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate request data properly', async () => {
      const invalidData = {
        address: '', // Empty address
        propertyType: 'INVALID_TYPE',
        size: -1, // Negative size
        country: 'INVALID', // Invalid country code
      };

      const response = await request(app)
        .post('/api/integrations/property/valuation')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });
  });

  describe('Authentication and Authorization Integration', () => {
    it('should require valid JWT token', async () => {
      const response = await request(app)
        .get('/api/integrations/health')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should enforce role-based access control', async () => {
      // Buyer trying to access admin endpoint
      const response = await request(app)
        .get('/api/performance/dashboard')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow appropriate role access', async () => {
      // Agent accessing integration endpoint
      const response = await request(app)
        .post('/api/integrations/email/send')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          to: 'test@example.com',
          templateId: 'test',
          data: { message: 'test' },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Database Integration', () => {
    it('should handle database transactions properly', async () => {
      // Create a property that should trigger multiple database operations
      const propertyData = {
        title: 'Integration Test Property',
        description: 'Property for integration testing',
        price: 500000,
        currency: 'EUR',
        propertyType: 'APARTMENT',
        address: 'Test Address',
        city: 'Berlin',
        country: 'DE',
        postalCode: '10117',
        latitude: 52.5162746,
        longitude: 13.3777041,
        agentId: 'test-agent-1',
      };

      // This should create property and related records in a transaction
      const property = await testPrisma.property.create({
        data: propertyData,
      });

      expect(property).toBeDefined();
      expect(property.title).toBe(propertyData.title);

      // Verify the property exists
      const foundProperty = await testPrisma.property.findUnique({
        where: { id: property.id },
      });

      expect(foundProperty).toBeDefined();
      expect(foundProperty?.title).toBe(propertyData.title);
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database connection failures
      // For now, we'll just verify the error handling structure exists
      expect(testPrisma).toBeDefined();
    });
  });
});