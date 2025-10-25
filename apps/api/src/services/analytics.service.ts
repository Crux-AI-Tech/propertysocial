import { Request } from 'express';
import logger, { logUserActivity, logBusinessEvent } from '../utils/logger';
import MonitoringService from './monitoring.service';

export interface UserEvent {
  userId: string;
  sessionId: string;
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  referrer?: string;
  page?: string;
}

export interface BusinessMetric {
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: string;
}

export interface PageView {
  userId?: string;
  sessionId: string;
  page: string;
  title?: string;
  referrer?: string;
  timestamp: string;
  duration?: number;
  ip?: string;
  userAgent?: string;
  country?: string;
  city?: string;
}

export interface ConversionEvent {
  userId: string;
  event: string;
  value?: number;
  currency?: string;
  properties: Record<string, any>;
  timestamp: string;
  funnel?: string;
  step?: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private monitoring: MonitoringService;
  private events: UserEvent[] = [];
  private pageViews: PageView[] = [];
  private conversions: ConversionEvent[] = [];
  private businessMetrics: BusinessMetric[] = [];

  private constructor() {
    this.monitoring = MonitoringService.getInstance();
    this.startPeriodicFlush();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // Start periodic data flushing to external analytics services
  private startPeriodicFlush(): void {
    // Flush events every 30 seconds
    setInterval(() => {
      this.flushEvents();
    }, 30000);

    // Generate daily reports at midnight
    setInterval(() => {
      if (new Date().getHours() === 0 && new Date().getMinutes() === 0) {
        this.generateDailyReport();
      }
    }, 60000); // Check every minute
  }

  // Track user event
  trackEvent(event: Omit<UserEvent, 'timestamp'>): void {
    const userEvent: UserEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.push(userEvent);
    logUserActivity(event.userId, event.event, event.properties);

    // Update real-time metrics
    this.monitoring.incrementMetric(`events.${event.event}`);
    this.monitoring.incrementMetric('events.total');

    // Track user engagement
    this.updateUserEngagement(event.userId, event.event);
  }

  // Track page view
  trackPageView(pageView: Omit<PageView, 'timestamp'>): void {
    const view: PageView = {
      ...pageView,
      timestamp: new Date().toISOString(),
    };

    this.pageViews.push(view);
    
    // Update page view metrics
    this.monitoring.incrementMetric('pageViews.total');
    this.monitoring.incrementMetric(`pageViews.${pageView.page.replace(/[^a-zA-Z0-9]/g, '_')}`);

    logger.info('Page view tracked', {
      userId: pageView.userId,
      page: pageView.page,
      sessionId: pageView.sessionId,
    });
  }

  // Track conversion event
  trackConversion(conversion: Omit<ConversionEvent, 'timestamp'>): void {
    const conversionEvent: ConversionEvent = {
      ...conversion,
      timestamp: new Date().toISOString(),
    };

    this.conversions.push(conversionEvent);
    logBusinessEvent('conversion', conversionEvent, conversion.userId);

    // Update conversion metrics
    this.monitoring.incrementMetric(`conversions.${conversion.event}`);
    this.monitoring.incrementMetric('conversions.total');

    if (conversion.value) {
      const currentRevenue = this.monitoring.getMetric('revenue.total', 0);
      this.monitoring.setMetric('revenue.total', currentRevenue + conversion.value);
    }
  }

  // Track business metric
  trackBusinessMetric(metric: Omit<BusinessMetric, 'timestamp'>): void {
    const businessMetric: BusinessMetric = {
      ...metric,
      timestamp: new Date().toISOString(),
    };

    this.businessMetrics.push(businessMetric);
    this.monitoring.setMetric(`business.${metric.name}`, metric.value);

    logger.info('Business metric tracked', businessMetric);
  }

  // Update user engagement metrics
  private updateUserEngagement(userId: string, event: string): void {
    const engagementEvents = ['property_view', 'search', 'favorite_add', 'contact_agent', 'offer_submit'];
    
    if (engagementEvents.includes(event)) {
      this.monitoring.incrementMetric(`engagement.${event}`);
      
      // Track daily active users
      const today = new Date().toISOString().split('T')[0];
      const dauKey = `dau.${today}`;
      const activeUsers = this.monitoring.getMetric(dauKey, new Set());
      activeUsers.add(userId);
      this.monitoring.setMetric(dauKey, activeUsers);
    }
  }

  // Get analytics dashboard data
  getAnalyticsDashboard(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): any {
    const now = new Date();
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const startTime = new Date(now.getTime() - timeRangeMs);

    // Filter events by time range
    const recentEvents = this.events.filter(
      event => new Date(event.timestamp) >= startTime
    );
    const recentPageViews = this.pageViews.filter(
      view => new Date(view.timestamp) >= startTime
    );
    const recentConversions = this.conversions.filter(
      conversion => new Date(conversion.timestamp) >= startTime
    );

    // Calculate metrics
    const uniqueUsers = new Set(recentEvents.map(e => e.userId)).size;
    const totalPageViews = recentPageViews.length;
    const totalEvents = recentEvents.length;
    const totalConversions = recentConversions.length;
    const totalRevenue = recentConversions.reduce((sum, c) => sum + (c.value || 0), 0);

    // Top events
    const eventCounts = recentEvents.reduce((acc, event) => {
      acc[event.event] = (acc[event.event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top pages
    const pageCounts = recentPageViews.reduce((acc, view) => {
      acc[view.page] = (acc[view.page] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Conversion funnel
    const funnelData = this.calculateConversionFunnel(recentEvents);

    return {
      timeRange,
      period: {
        start: startTime.toISOString(),
        end: now.toISOString(),
      },
      overview: {
        uniqueUsers,
        totalPageViews,
        totalEvents,
        totalConversions,
        totalRevenue,
        conversionRate: totalEvents > 0 ? (totalConversions / totalEvents) * 100 : 0,
      },
      topEvents: Object.entries(eventCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([event, count]) => ({ event, count })),
      topPages: Object.entries(pageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([page, count]) => ({ page, count })),
      conversionFunnel: funnelData,
      recentActivity: recentEvents
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50),
    };
  }

  // Calculate conversion funnel
  private calculateConversionFunnel(events: UserEvent[]): any {
    const funnelSteps = [
      'property_search',
      'property_view',
      'contact_agent',
      'schedule_viewing',
      'offer_submit',
      'offer_accept'
    ];

    const userJourneys = events.reduce((acc, event) => {
      if (!acc[event.userId]) {
        acc[event.userId] = [];
      }
      acc[event.userId].push(event.event);
      return acc;
    }, {} as Record<string, string[]>);

    const funnelData = funnelSteps.map((step, index) => {
      const usersAtStep = Object.values(userJourneys).filter(journey => 
        journey.includes(step)
      ).length;

      const previousStep = index > 0 ? funnelSteps[index - 1] : null;
      const usersAtPreviousStep = previousStep 
        ? Object.values(userJourneys).filter(journey => 
            journey.includes(previousStep)
          ).length
        : Object.keys(userJourneys).length;

      const conversionRate = usersAtPreviousStep > 0 
        ? (usersAtStep / usersAtPreviousStep) * 100 
        : 0;

      return {
        step,
        users: usersAtStep,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    });

    return funnelData;
  }

  // Get user journey
  getUserJourney(userId: string, timeRange: '1h' | '24h' | '7d' | '30d' = '7d'): any {
    const now = new Date();
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const startTime = new Date(now.getTime() - timeRangeMs);

    const userEvents = this.events
      .filter(event => 
        event.userId === userId && 
        new Date(event.timestamp) >= startTime
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const userPageViews = this.pageViews
      .filter(view => 
        view.userId === userId && 
        new Date(view.timestamp) >= startTime
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const userConversions = this.conversions
      .filter(conversion => 
        conversion.userId === userId && 
        new Date(conversion.timestamp) >= startTime
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Merge and sort all activities
    const activities = [
      ...userEvents.map(e => ({ ...e, type: 'event' })),
      ...userPageViews.map(v => ({ ...v, type: 'pageView' })),
      ...userConversions.map(c => ({ ...c, type: 'conversion' })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      userId,
      timeRange,
      period: {
        start: startTime.toISOString(),
        end: now.toISOString(),
      },
      summary: {
        totalEvents: userEvents.length,
        totalPageViews: userPageViews.length,
        totalConversions: userConversions.length,
        totalRevenue: userConversions.reduce((sum, c) => sum + (c.value || 0), 0),
      },
      activities,
    };
  }

  // Get real-time analytics
  getRealTimeAnalytics(): any {
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentEvents = this.events.filter(
      event => new Date(event.timestamp) >= last5Minutes
    );
    const recentPageViews = this.pageViews.filter(
      view => new Date(view.timestamp) >= last5Minutes
    );

    const activeUsers = new Set([
      ...recentEvents.map(e => e.userId),
      ...recentPageViews.filter(v => v.userId).map(v => v.userId!)
    ]).size;

    const currentPageViews = recentPageViews.reduce((acc, view) => {
      acc[view.page] = (acc[view.page] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      timestamp: new Date().toISOString(),
      activeUsers,
      recentEvents: recentEvents.length,
      recentPageViews: recentPageViews.length,
      topPagesNow: Object.entries(currentPageViews)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([page, count]) => ({ page, count })),
      recentActivity: [
        ...recentEvents.map(e => ({ ...e, type: 'event' })),
        ...recentPageViews.map(v => ({ ...v, type: 'pageView' }))
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20),
    };
  }

  // Flush events to external services
  private async flushEvents(): Promise<void> {
    if (this.events.length === 0 && this.pageViews.length === 0 && this.conversions.length === 0) {
      return;
    }

    try {
      // In production, you would send these to external analytics services
      // like Google Analytics, Mixpanel, Amplitude, etc.
      
      logger.info('Flushing analytics data', {
        events: this.events.length,
        pageViews: this.pageViews.length,
        conversions: this.conversions.length,
        businessMetrics: this.businessMetrics.length,
      });

      // Simulate sending to external service
      await this.sendToExternalAnalytics({
        events: this.events,
        pageViews: this.pageViews,
        conversions: this.conversions,
        businessMetrics: this.businessMetrics,
      });

      // Clear local buffers after successful flush
      this.events = [];
      this.pageViews = [];
      this.conversions = [];
      this.businessMetrics = [];

    } catch (error) {
      logger.error('Failed to flush analytics data', error);
    }
  }

  // Send data to external analytics services
  private async sendToExternalAnalytics(data: any): Promise<void> {
    // This would integrate with services like:
    // - Google Analytics 4
    // - Mixpanel
    // - Amplitude
    // - Segment
    // - Custom analytics backend

    // For now, we'll just log the data
    logger.debug('Analytics data sent to external services', {
      eventCount: data.events.length,
      pageViewCount: data.pageViews.length,
      conversionCount: data.conversions.length,
    });
  }

  // Generate daily report
  private generateDailyReport(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    const dailyEvents = this.events.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= yesterday && eventDate < today;
    });

    const dailyPageViews = this.pageViews.filter(view => {
      const viewDate = new Date(view.timestamp);
      return viewDate >= yesterday && viewDate < today;
    });

    const dailyConversions = this.conversions.filter(conversion => {
      const conversionDate = new Date(conversion.timestamp);
      return conversionDate >= yesterday && conversionDate < today;
    });

    const report = {
      date: yesterday.toISOString().split('T')[0],
      summary: {
        uniqueUsers: new Set(dailyEvents.map(e => e.userId)).size,
        totalEvents: dailyEvents.length,
        totalPageViews: dailyPageViews.length,
        totalConversions: dailyConversions.length,
        totalRevenue: dailyConversions.reduce((sum, c) => sum + (c.value || 0), 0),
      },
      topEvents: this.getTopItems(dailyEvents, 'event'),
      topPages: this.getTopItems(dailyPageViews, 'page'),
    };

    logBusinessEvent('daily_report', report);
    logger.info('Daily analytics report generated', report);
  }

  // Helper method to get top items
  private getTopItems(items: any[], field: string): Array<{ item: string; count: number }> {
    const counts = items.reduce((acc, item) => {
      const key = item[field];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([item, count]) => ({ item, count }));
  }

  // Helper method to convert time range to milliseconds
  private getTimeRangeMs(timeRange: string): number {
    switch (timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  // Middleware for automatic page view tracking
  pageViewMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      // Track page views for GET requests to HTML pages
      if (req.method === 'GET' && req.accepts('html')) {
        const sessionId = req.session?.id || 'anonymous';
        const userId = (req as any).user?.id;

        this.trackPageView({
          userId,
          sessionId,
          page: req.path,
          referrer: req.get('Referrer'),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });
      }

      next();
    };
  }

  // Middleware for automatic event tracking
  eventTrackingMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      // Track API usage events
      if (req.method !== 'GET' && req.path.startsWith('/api/')) {
        const userId = (req as any).user?.id;
        const sessionId = req.session?.id || 'anonymous';

        if (userId) {
          this.trackEvent({
            userId,
            sessionId,
            event: `api_${req.method.toLowerCase()}_${req.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
            properties: {
              method: req.method,
              path: req.path,
              userAgent: req.get('User-Agent'),
            },
            ip: req.ip,
            userAgent: req.get('User-Agent'),
          });
        }
      }

      next();
    };
  }
}

export default AnalyticsService;