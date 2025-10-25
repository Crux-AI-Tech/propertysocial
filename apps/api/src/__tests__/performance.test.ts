import request from 'supertest';
import { performance } from 'perf_hooks';
import { testPrisma, setupMocks, createTestToken } from './setup';
import { CacheService } from '../services/cache.service';
import { PerformanceService } from '../services/performance.service';
import app from '../main';

// Setup mocks
setupMocks();

describe('Performance Tests', () => {
  let agentToken: string;
  let buyerToken: string;

  beforeAll(async () => {
    agentToken = createTestToken('perf-agent-1', 'AGENT');
    buyerToken = createTestToken('perf-buyer-1', 'BUYER');

    // Create test data for performance testing
    await createTestData();
  });

  describe('API Response Time Tests', () => {
    it('should respond to property listing requests within acceptable time', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/properties')
        .query({ limit: 20 })
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(500); // 500ms threshold
      
      console.log(`Property listing response time: ${responseTime.toFixed(2)}ms`);
    });

    it('should respond to property search requests within acceptable time', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/properties')
        .query({
          city: 'Berlin',
          propertyType: 'APARTMENT',
          minPrice: 300000,
          maxPrice: 800000,
        })
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(800); // 800ms threshold for complex queries
      
      console.log(`Property search response time: ${responseTime.toFixed(2)}ms`);
    });

    it('should respond to property details requests within acceptable time', async () => {
      // Get a property ID first
      const listResponse = await request(app)
        .get('/api/properties')
        .query({ limit: 1 });

      const propertyId = listResponse.body.data.properties[0].id;

      const startTime = performance.now();
      
      const response = await request(app)
        .get(`/api/properties/${propertyId}`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(300); // 300ms threshold
      
      console.log(`Property details response time: ${responseTime.toFixed(2)}ms`);
    });

    it('should respond to integration requests within acceptable time', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/integrations/property/valuation')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          address: 'Test Address',
          propertyType: 'APARTMENT',
          size: 85,
          country: 'DE',
        })
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // 1s threshold for external API calls
      
      console.log(`Integration request response time: ${responseTime.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Request Tests', () => {
    it('should handle multiple concurrent property listing requests', async () => {
      const concurrentRequests = 20;
      const startTime = performance.now();

      const requests = Array(concurrentRequests).fill(null).map((_, index) =>
        request(app)
          .get('/api/properties')
          .query({ 
            page: Math.floor(index / 5) + 1,
            limit: 5 
          })
      );

      const responses = await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(totalTime).toBeLessThan(5000); // 5s total for 20 concurrent requests
      expect(averageTime).toBeLessThan(1000); // 1s average per request
      
      console.log(`Concurrent requests (${concurrentRequests}): Total ${totalTime.toFixed(2)}ms, Average ${averageTime.toFixed(2)}ms`);
    });

    it('should handle concurrent authentication requests', async () => {
      const concurrentRequests = 10;
      const startTime = performance.now();

      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${agentToken}`)
      );

      const responses = await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(totalTime).toBeLessThan(2000); // 2s total for 10 concurrent requests
      
      console.log(`Concurrent auth requests: ${totalTime.toFixed(2)}ms`);
    });

    it('should handle mixed concurrent requests', async () => {
      const startTime = performance.now();

      const requests = [
        // Property listing requests
        ...Array(5).fill(null).map(() => 
          request(app).get('/api/properties').query({ limit: 10 })
        ),
        // Authentication requests
        ...Array(3).fill(null).map(() => 
          request(app).get('/api/auth/me').set('Authorization', `Bearer ${agentToken}`)
        ),
        // Integration requests
        ...Array(2).fill(null).map(() => 
          request(app)
            .get('/api/integrations/payment/methods')
            .query({ country: 'DE', currency: 'EUR' })
            .set('Authorization', `Bearer ${buyerToken}`)
        ),
      ];

      const responses = await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(totalTime).toBeLessThan(3000); // 3s total for mixed requests
      
      console.log(`Mixed concurrent requests: ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Cache Performance Tests', () => {
    beforeEach(async () => {
      await CacheService.clear();
    });

    it('should demonstrate cache performance improvement', async () => {
      const cacheKey = 'performance-test-key';
      const testData = { 
        message: 'Performance test data',
        timestamp: Date.now(),
        data: Array(1000).fill(null).map((_, i) => ({ id: i, value: `item-${i}` }))
      };

      // First set - should be slower
      const setStartTime = performance.now();
      await CacheService.set(cacheKey, testData);
      const setEndTime = performance.now();
      const setTime = setEndTime - setStartTime;

      // First get - cache miss
      const missStartTime = performance.now();
      const missResult = await CacheService.get(cacheKey);
      const missEndTime = performance.now();
      const missTime = missEndTime - missStartTime;

      // Second get - cache hit
      const hitStartTime = performance.now();
      const hitResult = await CacheService.get(cacheKey);
      const hitEndTime = performance.now();
      const hitTime = hitEndTime - hitStartTime;

      expect(missResult).toEqual(testData);
      expect(hitResult).toEqual(testData);
      expect(hitTime).toBeLessThan(missTime); // Cache hit should be faster
      expect(hitTime).toBeLessThan(10); // Cache hit should be very fast

      console.log(`Cache performance - Set: ${setTime.toFixed(2)}ms, Miss: ${missTime.toFixed(2)}ms, Hit: ${hitTime.toFixed(2)}ms`);
    });

    it('should handle large cache operations efficiently', async () => {
      const largeData = Array(10000).fill(null).map((_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`,
        metadata: {
          created: new Date().toISOString(),
          tags: [`tag-${i % 10}`, `category-${i % 5}`],
        },
      }));

      const startTime = performance.now();
      
      // Set large data
      await CacheService.set('large-data-test', largeData);
      
      // Get large data
      const retrieved = await CacheService.get('large-data-test');
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(retrieved).toEqual(largeData);
      expect(totalTime).toBeLessThan(1000); // 1s for large data operations

      console.log(`Large cache operation (10k items): ${totalTime.toFixed(2)}ms`);
    });

    it('should handle multiple cache operations concurrently', async () => {
      const operations = 50;
      const startTime = performance.now();

      const promises = Array(operations).fill(null).map(async (_, i) => {
        const key = `concurrent-test-${i}`;
        const data = { id: i, value: `test-data-${i}` };
        
        await CacheService.set(key, data);
        const retrieved = await CacheService.get(key);
        
        expect(retrieved).toEqual(data);
        return retrieved;
      });

      await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(2000); // 2s for 50 concurrent operations

      console.log(`Concurrent cache operations (${operations}): ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Database Performance Tests', () => {
    it('should handle database queries efficiently', async () => {
      const startTime = performance.now();

      // Complex query with joins and filters
      const properties = await testPrisma.property.findMany({
        where: {
          status: 'ACTIVE',
          price: {
            gte: 300000,
            lte: 800000,
          },
          city: 'Berlin',
        },
        include: {
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      });

      const endTime = performance.now();
      const queryTime = endTime - startTime;

      expect(Array.isArray(properties)).toBe(true);
      expect(queryTime).toBeLessThan(500); // 500ms for complex query

      console.log(`Complex database query: ${queryTime.toFixed(2)}ms`);
    });

    it('should handle concurrent database operations', async () => {
      const concurrentOps = 10;
      const startTime = performance.now();

      const operations = Array(concurrentOps).fill(null).map(async (_, i) => {
        return testPrisma.property.findMany({
          where: {
            status: 'ACTIVE',
          },
          skip: i * 5,
          take: 5,
        });
      });

      const results = await Promise.all(operations);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });

      expect(totalTime).toBeLessThan(1000); // 1s for 10 concurrent queries

      console.log(`Concurrent database operations (${concurrentOps}): ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not have significant memory leaks during operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/properties')
          .query({ limit: 10 });
        
        // Set and get cache data
        await CacheService.set(`memory-test-${i}`, { data: `test-${i}` });
        await CacheService.get(`memory-test-${i}`);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      console.log(`Memory usage - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(2)}%)`);

      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);
    });
  });

  describe('Load Testing Simulation', () => {
    it('should handle sustained load', async () => {
      const duration = 10000; // 10 seconds
      const requestsPerSecond = 5;
      const totalRequests = (duration / 1000) * requestsPerSecond;
      
      const startTime = performance.now();
      let completedRequests = 0;
      let failedRequests = 0;
      const responseTimes: number[] = [];

      const makeRequest = async () => {
        const reqStartTime = performance.now();
        try {
          const response = await request(app)
            .get('/api/properties')
            .query({ limit: 5 });
          
          const reqEndTime = performance.now();
          const reqTime = reqEndTime - reqStartTime;
          responseTimes.push(reqTime);
          
          if (response.status === 200) {
            completedRequests++;
          } else {
            failedRequests++;
          }
        } catch (error) {
          failedRequests++;
        }
      };

      // Create requests at specified rate
      const interval = 1000 / requestsPerSecond;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < totalRequests; i++) {
        setTimeout(() => {
          promises.push(makeRequest());
        }, i * interval);
      }

      // Wait for all requests to complete
      await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const successRate = (completedRequests / (completedRequests + failedRequests)) * 100;

      console.log(`Load test results:`);
      console.log(`- Duration: ${totalTime.toFixed(2)}ms`);
      console.log(`- Total requests: ${totalRequests}`);
      console.log(`- Completed: ${completedRequests}`);
      console.log(`- Failed: ${failedRequests}`);
      console.log(`- Success rate: ${successRate.toFixed(2)}%`);
      console.log(`- Average response time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`- Min response time: ${minResponseTime.toFixed(2)}ms`);
      console.log(`- Max response time: ${maxResponseTime.toFixed(2)}ms`);

      // Assertions
      expect(successRate).toBeGreaterThan(95); // 95% success rate
      expect(averageResponseTime).toBeLessThan(1000); // 1s average response time
      expect(maxResponseTime).toBeLessThan(5000); // 5s max response time
    });
  });
});

/**
 * Create test data for performance testing
 */
async function createTestData(): Promise<void> {
  // Create test agent
  const agent = await testPrisma.user.create({
    data: {
      id: 'perf-agent-1',
      email: 'perf-agent@test.com',
      password: '$2b$10$hashedpassword',
      firstName: 'Performance',
      lastName: 'Agent',
      role: 'AGENT',
      status: 'ACTIVE',
      country: 'DE',
      language: 'en',
      emailVerified: true,
    },
  });

  // Create test buyer
  await testPrisma.user.create({
    data: {
      id: 'perf-buyer-1',
      email: 'perf-buyer@test.com',
      password: '$2b$10$hashedpassword',
      firstName: 'Performance',
      lastName: 'Buyer',
      role: 'BUYER',
      status: 'ACTIVE',
      country: 'DE',
      language: 'en',
      emailVerified: true,
    },
  });

  // Create test properties
  const properties = Array(50).fill(null).map((_, i) => ({
    title: `Performance Test Property ${i + 1}`,
    description: `Description for performance test property ${i + 1}`,
    propertyType: i % 2 === 0 ? 'APARTMENT' : 'HOUSE',
    status: 'ACTIVE',
    price: 300000 + (i * 10000),
    currency: 'EUR',
    size: 50 + (i * 2),
    bedrooms: 1 + (i % 4),
    bathrooms: 1 + (i % 3),
    address: `Performance Street ${i + 1}`,
    city: i % 3 === 0 ? 'Berlin' : i % 3 === 1 ? 'Munich' : 'Hamburg',
    country: 'DE',
    postalCode: `${10000 + i}`,
    latitude: 52.5 + (i * 0.01),
    longitude: 13.4 + (i * 0.01),
    agentId: agent.id,
  }));

  await testPrisma.property.createMany({
    data: properties,
  });
}