import request from 'supertest';
import express from 'express';
import MonitoringService from '../services/monitoring.service';
import AnalyticsService from '../services/analytics.service';
import ErrorTrackingService from '../services/error-tracking.service';
import logger from '../utils/logger';

// Mock logger to avoid console output during tests
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  requestLogger: jest.fn((req, res, next) => next()),
  logError: jest.fn(),
  logUserActivity: jest.fn(),
  logBusinessEvent: jest.fn(),
  logSecurityEvent: jest.fn(),
  PerformanceMonitor: {
    startTimer: jest.fn(),
    endTimer: jest.fn(),
    measureAsync: jest.fn(),
    measure: jest.fn(),
  },
}));

describe('Monitoring and Logging System', () => {
  let app: express.Application;
  let monitoring: MonitoringService;
  let analytics: AnalyticsService;
  let errorTracking: ErrorTrackingService;

  beforeEach(() => {
    app = express();
    monitoring = MonitoringService.getInstance();
    analytics = AnalyticsService.getInstance();
    errorTracking = ErrorTrackingService.getInstance();

    // Setup basic middleware
    app.use(express.json());
    app.use(monitoring.requestMonitoringMiddleware());
    app.use(analytics.eventTrackingMiddleware());

    // Test routes
    app.get('/test', (req, res) => {
      res.json({ message: 'test' });
    });

    app.get('/test/error', (req, res) => {
      throw new Error('Test error');
    });

    app.use(monitoring.errorMonitoringMiddleware());
    app.use(errorTracking.errorHandlingMiddleware());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('MonitoringService', () => {
    describe('Health Checks', () => {
      it('should return system health status', async () => {
        const healthStatus = await monitoring.getHealthStatus();

        expect(healthStatus).toHaveProperty('status');
        expect(healthStatus).toHaveProperty('version');
        expect(healthStatus).toHaveProperty('checks');
        expect(['pass', 'warn', 'fail']).toContain(healthStatus.status);
      });

      it('should register custom health checks', async () => {
        const customCheck = jest.fn().mockResolvedValue({
          status: 'pass',
          componentType: 'custom',
          time: new Date().toISOString(),
          output: 'Custom check passed',
        });

        monitoring.registerHealthCheck('custom', customCheck);
        await monitoring.runHealthChecks();

        expect(customCheck).toHaveBeenCalled();
      });
    });

    describe('System Metrics', () => {
      it('should collect system metrics', () => {
        const metrics = monitoring.getSystemMetrics();

        if (metrics) {
          expect(metrics).toHaveProperty('timestamp');
          expect(metrics).toHaveProperty('memory');
          expect(metrics).toHaveProperty('cpu');
          expect(metrics).toHaveProperty('process');
          expect(metrics.memory).toHaveProperty('used');
          expect(metrics.memory).toHaveProperty('free');
          expect(metrics.memory).toHaveProperty('total');
        }
      });

      it('should track custom metrics', () => {
        monitoring.setMetric('test.metric', 100);
        expect(monitoring.getMetric('test.metric')).toBe(100);

        monitoring.incrementMetric('test.counter', 5);
        expect(monitoring.getMetric('test.counter')).toBe(5);

        monitoring.incrementMetric('test.counter', 3);
        expect(monitoring.getMetric('test.counter')).toBe(8);
      });

      it('should record timing metrics', () => {
        monitoring.recordTiming('test.timing', 100);
        monitoring.recordTiming('test.timing', 200);
        monitoring.recordTiming('test.timing', 150);

        expect(monitoring.getMetric('test.timing.average')).toBe(150);
        expect(monitoring.getMetric('test.timing.timings')).toHaveLength(3);
      });
    });

    describe('Request Monitoring Middleware', () => {
      it('should track request metrics', async () => {
        const response = await request(app)
          .get('/test')
          .expect(200);

        expect(response.body).toEqual({ message: 'test' });
        
        // Verify metrics were updated
        expect(monitoring.getMetric('requests.total', 0)).toBeGreaterThan(0);
      });

      it('should track error metrics', async () => {
        await request(app)
          .get('/test/error')
          .expect(500);

        expect(monitoring.getMetric('requests.total', 0)).toBeGreaterThan(0);
        expect(monitoring.getMetric('errors.total', 0)).toBeGreaterThan(0);
      });
    });
  });

  describe('AnalyticsService', () => {
    describe('Event Tracking', () => {
      it('should track user events', () => {
        const event = {
          userId: 'user123',
          sessionId: 'session123',
          event: 'property_view',
          properties: { propertyId: 'prop123' },
        };

        analytics.trackEvent(event);

        // Verify event was tracked
        expect(monitoring.getMetric('events.property_view', 0)).toBeGreaterThan(0);
        expect(monitoring.getMetric('events.total', 0)).toBeGreaterThan(0);
      });

      it('should track page views', () => {
        const pageView = {
          userId: 'user123',
          sessionId: 'session123',
          page: '/properties/search',
          title: 'Property Search',
        };

        analytics.trackPageView(pageView);

        expect(monitoring.getMetric('pageViews.total', 0)).toBeGreaterThan(0);
      });

      it('should track conversions', () => {
        const conversion = {
          userId: 'user123',
          event: 'offer_submit',
          value: 450000,
          currency: 'EUR',
          properties: { propertyId: 'prop123' },
        };

        analytics.trackConversion(conversion);

        expect(monitoring.getMetric('conversions.offer_submit', 0)).toBeGreaterThan(0);
        expect(monitoring.getMetric('conversions.total', 0)).toBeGreaterThan(0);
        expect(monitoring.getMetric('revenue.total', 0)).toBe(450000);
      });

      it('should track business metrics', () => {
        const metric = {
          name: 'average_property_price',
          value: 350000,
          unit: 'EUR',
          tags: { city: 'Berlin' },
        };

        analytics.trackBusinessMetric(metric);

        expect(monitoring.getMetric('business.average_property_price')).toBe(350000);
      });
    });

    describe('Analytics Dashboard', () => {
      beforeEach(() => {
        // Add some test data
        analytics.trackEvent({
          userId: 'user1',
          sessionId: 'session1',
          event: 'property_view',
          properties: { propertyId: 'prop1' },
        });

        analytics.trackPageView({
          userId: 'user1',
          sessionId: 'session1',
          page: '/properties/search',
        });

        analytics.trackConversion({
          userId: 'user1',
          event: 'offer_submit',
          value: 300000,
          currency: 'EUR',
          properties: { propertyId: 'prop1' },
        });
      });

      it('should generate dashboard data', () => {
        const dashboard = analytics.getAnalyticsDashboard('1h');

        expect(dashboard).toHaveProperty('timeRange', '1h');
        expect(dashboard).toHaveProperty('overview');
        expect(dashboard).toHaveProperty('topEvents');
        expect(dashboard).toHaveProperty('topPages');
        expect(dashboard).toHaveProperty('conversionFunnel');

        expect(dashboard.overview).toHaveProperty('uniqueUsers');
        expect(dashboard.overview).toHaveProperty('totalPageViews');
        expect(dashboard.overview).toHaveProperty('totalEvents');
        expect(dashboard.overview).toHaveProperty('totalConversions');
        expect(dashboard.overview).toHaveProperty('totalRevenue');
      });

      it('should generate real-time analytics', () => {
        const realtime = analytics.getRealTimeAnalytics();

        expect(realtime).toHaveProperty('timestamp');
        expect(realtime).toHaveProperty('activeUsers');
        expect(realtime).toHaveProperty('recentEvents');
        expect(realtime).toHaveProperty('recentPageViews');
        expect(realtime).toHaveProperty('topPagesNow');
        expect(realtime).toHaveProperty('recentActivity');
      });

      it('should generate user journey', () => {
        const journey = analytics.getUserJourney('user1', '24h');

        expect(journey).toHaveProperty('userId', 'user1');
        expect(journey).toHaveProperty('timeRange', '24h');
        expect(journey).toHaveProperty('summary');
        expect(journey).toHaveProperty('activities');

        expect(journey.summary).toHaveProperty('totalEvents');
        expect(journey.summary).toHaveProperty('totalPageViews');
        expect(journey.summary).toHaveProperty('totalConversions');
      });
    });
  });

  describe('ErrorTrackingService', () => {
    describe('Error Tracking', () => {
      it('should track application errors', () => {
        const error = new Error('Test application error');
        const context = {
          userId: 'user123',
          url: '/api/test',
          method: 'GET',
        };

        const errorId = errorTracking.trackError(error, context);

        expect(errorId).toMatch(/^err_/);
        
        const trackedError = errorTracking.getError(errorId);
        expect(trackedError).toBeTruthy();
        expect(trackedError?.error.message).toBe('Test application error');
        expect(trackedError?.context.userId).toBe('user123');
      });

      it('should track security incidents', () => {
        const incident = 'Suspicious login attempt';
        const details = {
          userId: 'user123',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
        };

        const errorId = errorTracking.trackSecurityIncident(incident, details, 'high');

        const trackedError = errorTracking.getError(errorId);
        expect(trackedError).toBeTruthy();
        expect(trackedError?.error.message).toContain('Security incident');
        expect(trackedError?.level).toBe('high');
        expect(trackedError?.type).toBe('security');
      });

      it('should deduplicate similar errors', () => {
        const error1 = new Error('Duplicate error');
        const error2 = new Error('Duplicate error');
        const context = { url: '/api/test', method: 'GET' };

        const errorId1 = errorTracking.trackError(error1, context);
        const errorId2 = errorTracking.trackError(error2, context);

        const trackedError1 = errorTracking.getError(errorId1);
        const trackedError2 = errorTracking.getError(errorId2);

        // Should be the same error (deduplication)
        if (trackedError1 && trackedError2) {
          expect(trackedError1.fingerprint).toBe(trackedError2.fingerprint);
          expect(trackedError1.count).toBeGreaterThan(1);
        }
      });

      it('should resolve errors', () => {
        const error = new Error('Resolvable error');
        const errorId = errorTracking.trackError(error);

        const resolved = errorTracking.resolveError(errorId, 'developer@example.com');
        expect(resolved).toBe(true);

        const trackedError = errorTracking.getError(errorId);
        expect(trackedError?.resolved).toBe(true);
        expect(trackedError?.assignee).toBe('developer@example.com');
      });
    });

    describe('Error Statistics', () => {
      beforeEach(() => {
        // Add test errors
        errorTracking.trackError(new Error('Error 1'), { url: '/api/test1' });
        errorTracking.trackError(new Error('Error 2'), { url: '/api/test2' });
        errorTracking.trackSecurityIncident('Security issue', { ip: '1.2.3.4' }, 'critical');
      });

      it('should generate error statistics', () => {
        const stats = errorTracking.getErrorStatistics('1h');

        expect(stats).toHaveProperty('timeRange', '1h');
        expect(stats).toHaveProperty('summary');
        expect(stats).toHaveProperty('breakdown');
        expect(stats).toHaveProperty('topErrors');

        expect(stats.summary).toHaveProperty('totalErrors');
        expect(stats.summary).toHaveProperty('uniqueErrors');
        expect(stats.summary).toHaveProperty('resolvedErrors');
        expect(stats.summary).toHaveProperty('errorRate');

        expect(stats.breakdown).toHaveProperty('byLevel');
        expect(stats.breakdown).toHaveProperty('byType');
      });

      it('should filter errors by criteria', () => {
        const criticalErrors = errorTracking.getErrors({ level: 'critical' });
        const securityErrors = errorTracking.getErrors({ type: 'security' });
        const unresolvedErrors = errorTracking.getErrors({ resolved: false });

        expect(criticalErrors.length).toBeGreaterThan(0);
        expect(securityErrors.length).toBeGreaterThan(0);
        expect(unresolvedErrors.length).toBeGreaterThan(0);

        criticalErrors.forEach(error => {
          expect(error.level).toBe('critical');
        });

        securityErrors.forEach(error => {
          expect(error.type).toBe('security');
        });

        unresolvedErrors.forEach(error => {
          expect(error.resolved).toBe(false);
        });
      });
    });

    describe('Alert Rules', () => {
      it('should add custom alert rules', () => {
        const rule = {
          name: 'Test Alert',
          description: 'Test alert rule',
          enabled: true,
          conditions: {
            errorRate: 5,
            timeWindow: 10,
          },
          actions: {
            email: ['test@example.com'],
          },
          cooldown: 15,
        };

        const ruleId = errorTracking.addAlertRule(rule);
        expect(ruleId).toMatch(/^rule_/);

        const rules = errorTracking.getAlertRules();
        const addedRule = rules.find(r => r.id === ruleId);
        expect(addedRule).toBeTruthy();
        expect(addedRule?.name).toBe('Test Alert');
      });

      it('should update alert rules', () => {
        const rules = errorTracking.getAlertRules();
        const firstRule = rules[0];

        if (firstRule) {
          const updated = errorTracking.updateAlertRule(firstRule.id, {
            enabled: false,
            description: 'Updated description',
          });

          expect(updated).toBe(true);

          const updatedRules = errorTracking.getAlertRules();
          const updatedRule = updatedRules.find(r => r.id === firstRule.id);
          expect(updatedRule?.enabled).toBe(false);
          expect(updatedRule?.description).toBe('Updated description');
        }
      });

      it('should delete alert rules', () => {
        const rules = errorTracking.getAlertRules();
        const initialCount = rules.length;

        if (rules.length > 0) {
          const deleted = errorTracking.deleteAlertRule(rules[0].id);
          expect(deleted).toBe(true);

          const updatedRules = errorTracking.getAlertRules();
          expect(updatedRules.length).toBe(initialCount - 1);
        }
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle request lifecycle with all monitoring', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'test' });

      // Verify all monitoring systems tracked the request
      expect(monitoring.getMetric('requests.total', 0)).toBeGreaterThan(0);
      expect(monitoring.getMetric('requests.success', 0)).toBeGreaterThan(0);
    });

    it('should handle errors with all monitoring', async () => {
      await request(app)
        .get('/test/error')
        .expect(500);

      // Verify error was tracked by all systems
      expect(monitoring.getMetric('errors.total', 0)).toBeGreaterThan(0);
      
      const errors = errorTracking.getErrors({ limit: 1 });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].error.message).toBe('Test error');
    });
  });

  describe('Performance Tests', () => {
    it('should handle high volume of events efficiently', () => {
      const startTime = Date.now();
      
      // Track 1000 events
      for (let i = 0; i < 1000; i++) {
        analytics.trackEvent({
          userId: `user${i % 100}`,
          sessionId: `session${i % 50}`,
          event: 'test_event',
          properties: { index: i },
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      expect(monitoring.getMetric('events.total', 0)).toBeGreaterThanOrEqual(1000);
    });

    it('should handle high volume of errors efficiently', () => {
      const startTime = Date.now();
      
      // Track 100 errors
      for (let i = 0; i < 100; i++) {
        errorTracking.trackError(
          new Error(`Test error ${i}`),
          { url: `/api/test${i}` }
        );
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000);
      
      const errors = errorTracking.getErrors({ limit: 200 });
      expect(errors.length).toBeGreaterThanOrEqual(100);
    });
  });
});

describe('Logger Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log different levels correctly', () => {
    logger.info('Info message', { key: 'value' });
    logger.warn('Warning message', { key: 'value' });
    logger.error('Error message', { key: 'value' });
    logger.debug('Debug message', { key: 'value' });

    expect(logger.info).toHaveBeenCalledWith('Info message', { key: 'value' });
    expect(logger.warn).toHaveBeenCalledWith('Warning message', { key: 'value' });
    expect(logger.error).toHaveBeenCalledWith('Error message', { key: 'value' });
    expect(logger.debug).toHaveBeenCalledWith('Debug message', { key: 'value' });
  });
});