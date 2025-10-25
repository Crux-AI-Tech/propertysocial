import { Request } from 'express';
import logger, { logError, logSecurityEvent } from '../utils/logger';
import MonitoringService from './monitoring.service';

export interface ErrorReport {
  id: string;
  timestamp: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  type: 'application' | 'security' | 'performance' | 'business';
  error: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  context: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    url?: string;
    method?: string;
    userAgent?: string;
    ip?: string;
    environment: string;
    version: string;
  };
  metadata?: Record<string, any>;
  fingerprint: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
  assignee?: string;
  tags: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    errorRate?: number; // errors per minute
    errorCount?: number; // total errors in time window
    errorType?: string;
    level?: 'low' | 'medium' | 'high' | 'critical';
    timeWindow: number; // minutes
  };
  actions: {
    email?: string[];
    slack?: string;
    webhook?: string;
    pagerDuty?: boolean;
  };
  cooldown: number; // minutes before re-alerting
  lastTriggered?: string;
}

export class ErrorTrackingService {
  private static instance: ErrorTrackingService;
  private monitoring: MonitoringService;
  private errors: Map<string, ErrorReport> = new Map();
  private alertRules: AlertRule[] = [];
  private alertCooldowns: Map<string, number> = new Map();

  private constructor() {
    this.monitoring = MonitoringService.getInstance();
    this.initializeDefaultAlertRules();
    this.startErrorProcessing();
  }

  static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  // Initialize default alert rules
  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 10 errors per minute',
        enabled: true,
        conditions: {
          errorRate: 10,
          timeWindow: 5,
        },
        actions: {
          email: ['dev-team@eu-real-estate.com'],
          slack: '#alerts',
        },
        cooldown: 15,
      },
      {
        id: 'critical-errors',
        name: 'Critical Errors',
        description: 'Alert immediately on critical errors',
        enabled: true,
        conditions: {
          level: 'critical',
          errorCount: 1,
          timeWindow: 1,
        },
        actions: {
          email: ['dev-team@eu-real-estate.com', 'ops-team@eu-real-estate.com'],
          slack: '#critical-alerts',
          pagerDuty: true,
        },
        cooldown: 5,
      },
      {
        id: 'security-incidents',
        name: 'Security Incidents',
        description: 'Alert on security-related errors',
        enabled: true,
        conditions: {
          errorType: 'security',
          errorCount: 1,
          timeWindow: 1,
        },
        actions: {
          email: ['security-team@eu-real-estate.com'],
          slack: '#security-alerts',
        },
        cooldown: 0, // No cooldown for security alerts
      },
      {
        id: 'database-errors',
        name: 'Database Errors',
        description: 'Alert on database connection or query errors',
        enabled: true,
        conditions: {
          errorType: 'database',
          errorCount: 5,
          timeWindow: 5,
        },
        actions: {
          email: ['dba-team@eu-real-estate.com'],
          slack: '#database-alerts',
        },
        cooldown: 10,
      },
    ];
  }

  // Start error processing and alerting
  private startErrorProcessing(): void {
    // Process errors and check alert rules every minute
    setInterval(() => {
      this.processAlertRules();
    }, 60000);

    // Clean up old errors every hour
    setInterval(() => {
      this.cleanupOldErrors();
    }, 3600000);
  }

  // Track an error
  trackError(error: Error, context: Partial<ErrorReport['context']> = {}, metadata: Record<string, any> = {}): string {
    const errorId = this.generateErrorId();
    const fingerprint = this.generateFingerprint(error, context);
    const timestamp = new Date().toISOString();

    // Check if we've seen this error before
    const existingError = Array.from(this.errors.values()).find(e => e.fingerprint === fingerprint);

    if (existingError) {
      // Update existing error
      existingError.count++;
      existingError.lastSeen = timestamp;
      existingError.metadata = { ...existingError.metadata, ...metadata };
    } else {
      // Create new error report
      const errorReport: ErrorReport = {
        id: errorId,
        timestamp,
        level: this.determineErrorLevel(error, context),
        type: this.determineErrorType(error, context),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        },
        context: {
          environment: process.env.NODE_ENV || 'development',
          version: process.env.APP_VERSION || '1.0.0',
          ...context,
        },
        metadata,
        fingerprint,
        count: 1,
        firstSeen: timestamp,
        lastSeen: timestamp,
        resolved: false,
        tags: this.generateTags(error, context),
      };

      this.errors.set(errorId, errorReport);
    }

    // Log the error
    logError(error, { errorId, fingerprint, ...context, ...metadata });

    // Update monitoring metrics
    this.monitoring.incrementMetric('errors.total');
    this.monitoring.incrementMetric(`errors.${error.name}`);
    this.monitoring.incrementMetric(`errors.level.${this.determineErrorLevel(error, context)}`);

    return errorId;
  }

  // Track security incident
  trackSecurityIncident(incident: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): string {
    const error = new Error(`Security incident: ${incident}`);
    error.name = 'SecurityIncident';

    const errorId = this.trackError(error, {
      userId: details.userId,
      ip: details.ip,
      userAgent: details.userAgent,
    }, {
      incident,
      details,
      severity,
    });

    // Log security event
    logSecurityEvent(incident, details, severity);

    return errorId;
  }

  // Get error by ID
  getError(errorId: string): ErrorReport | null {
    return this.errors.get(errorId) || null;
  }

  // Get errors with filtering
  getErrors(filters: {
    level?: string;
    type?: string;
    resolved?: boolean;
    limit?: number;
    offset?: number;
    timeRange?: string;
  } = {}): ErrorReport[] {
    let errors = Array.from(this.errors.values());

    // Apply filters
    if (filters.level) {
      errors = errors.filter(e => e.level === filters.level);
    }
    if (filters.type) {
      errors = errors.filter(e => e.type === filters.type);
    }
    if (filters.resolved !== undefined) {
      errors = errors.filter(e => e.resolved === filters.resolved);
    }
    if (filters.timeRange) {
      const timeRangeMs = this.getTimeRangeMs(filters.timeRange);
      const cutoff = new Date(Date.now() - timeRangeMs).toISOString();
      errors = errors.filter(e => e.lastSeen >= cutoff);
    }

    // Sort by last seen (most recent first)
    errors.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    return errors.slice(offset, offset + limit);
  }

  // Resolve error
  resolveError(errorId: string, assignee?: string): boolean {
    const error = this.errors.get(errorId);
    if (!error) {
      return false;
    }

    error.resolved = true;
    error.assignee = assignee;

    logger.info('Error resolved', {
      errorId,
      assignee,
      fingerprint: error.fingerprint,
    });

    return true;
  }

  // Get error statistics
  getErrorStatistics(timeRange: string = '24h'): any {
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const cutoff = new Date(Date.now() - timeRangeMs).toISOString();
    
    const recentErrors = Array.from(this.errors.values()).filter(
      e => e.lastSeen >= cutoff
    );

    const totalErrors = recentErrors.reduce((sum, e) => sum + e.count, 0);
    const uniqueErrors = recentErrors.length;
    const resolvedErrors = recentErrors.filter(e => e.resolved).length;

    // Group by level
    const errorsByLevel = recentErrors.reduce((acc, error) => {
      acc[error.level] = (acc[error.level] || 0) + error.count;
      return acc;
    }, {} as Record<string, number>);

    // Group by type
    const errorsByType = recentErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + error.count;
      return acc;
    }, {} as Record<string, number>);

    // Top errors
    const topErrors = recentErrors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(e => ({
        id: e.id,
        message: e.error.message,
        count: e.count,
        level: e.level,
        type: e.type,
        lastSeen: e.lastSeen,
      }));

    return {
      timeRange,
      period: {
        start: cutoff,
        end: new Date().toISOString(),
      },
      summary: {
        totalErrors,
        uniqueErrors,
        resolvedErrors,
        unresolvedErrors: uniqueErrors - resolvedErrors,
        errorRate: totalErrors / (timeRangeMs / 60000), // errors per minute
      },
      breakdown: {
        byLevel: errorsByLevel,
        byType: errorsByType,
      },
      topErrors,
    };
  }

  // Process alert rules
  private processAlertRules(): void {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastTriggered = this.alertCooldowns.get(rule.id);
      if (lastTriggered && Date.now() - lastTriggered < rule.cooldown * 60000) {
        continue;
      }

      // Check conditions
      if (this.checkAlertConditions(rule)) {
        this.triggerAlert(rule);
        this.alertCooldowns.set(rule.id, Date.now());
      }
    }
  }

  // Check if alert conditions are met
  private checkAlertConditions(rule: AlertRule): boolean {
    const timeWindow = rule.conditions.timeWindow * 60000; // Convert to milliseconds
    const cutoff = new Date(Date.now() - timeWindow).toISOString();
    
    let relevantErrors = Array.from(this.errors.values()).filter(
      e => e.lastSeen >= cutoff
    );

    // Apply condition filters
    if (rule.conditions.level) {
      relevantErrors = relevantErrors.filter(e => e.level === rule.conditions.level);
    }
    if (rule.conditions.errorType) {
      relevantErrors = relevantErrors.filter(e => e.type === rule.conditions.errorType);
    }

    const totalErrorCount = relevantErrors.reduce((sum, e) => sum + e.count, 0);
    const errorRate = totalErrorCount / rule.conditions.timeWindow;

    // Check conditions
    if (rule.conditions.errorRate && errorRate >= rule.conditions.errorRate) {
      return true;
    }
    if (rule.conditions.errorCount && totalErrorCount >= rule.conditions.errorCount) {
      return true;
    }

    return false;
  }

  // Trigger alert
  private triggerAlert(rule: AlertRule): void {
    const alertData = {
      rule: rule.name,
      description: rule.description,
      timestamp: new Date().toISOString(),
      conditions: rule.conditions,
    };

    logger.warn('Alert triggered', alertData);

    // Send notifications based on rule actions
    if (rule.actions.email) {
      this.sendEmailAlert(rule.actions.email, alertData);
    }
    if (rule.actions.slack) {
      this.sendSlackAlert(rule.actions.slack, alertData);
    }
    if (rule.actions.webhook) {
      this.sendWebhookAlert(rule.actions.webhook, alertData);
    }
    if (rule.actions.pagerDuty) {
      this.sendPagerDutyAlert(alertData);
    }

    // Update monitoring metrics
    this.monitoring.incrementMetric('alerts.triggered');
    this.monitoring.incrementMetric(`alerts.${rule.id}`);
  }

  // Send email alert
  private async sendEmailAlert(emails: string[], alertData: any): Promise<void> {
    // In production, integrate with email service (SendGrid, SES, etc.)
    logger.info('Email alert sent', { emails, alertData });
  }

  // Send Slack alert
  private async sendSlackAlert(channel: string, alertData: any): Promise<void> {
    // In production, integrate with Slack API
    logger.info('Slack alert sent', { channel, alertData });
  }

  // Send webhook alert
  private async sendWebhookAlert(webhook: string, alertData: any): Promise<void> {
    // In production, send HTTP POST to webhook URL
    logger.info('Webhook alert sent', { webhook, alertData });
  }

  // Send PagerDuty alert
  private async sendPagerDutyAlert(alertData: any): Promise<void> {
    // In production, integrate with PagerDuty API
    logger.info('PagerDuty alert sent', { alertData });
  }

  // Generate error ID
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Generate error fingerprint for deduplication
  private generateFingerprint(error: Error, context: any): string {
    const key = `${error.name}:${error.message}:${context.url || ''}:${context.method || ''}`;
    return Buffer.from(key).toString('base64').substring(0, 16);
  }

  // Determine error level
  private determineErrorLevel(error: Error, context: any): 'low' | 'medium' | 'high' | 'critical' {
    // Security errors are always high or critical
    if (error.name === 'SecurityIncident') {
      return 'critical';
    }

    // Database errors are typically high
    if (error.name.includes('Database') || error.name.includes('Connection')) {
      return 'high';
    }

    // Authentication errors are medium
    if (error.name.includes('Auth') || error.name.includes('Token')) {
      return 'medium';
    }

    // Validation errors are typically low
    if (error.name.includes('Validation') || error.name.includes('BadRequest')) {
      return 'low';
    }

    // Default to medium
    return 'medium';
  }

  // Determine error type
  private determineErrorType(error: Error, context: any): 'application' | 'security' | 'performance' | 'business' {
    if (error.name === 'SecurityIncident' || error.name.includes('Security')) {
      return 'security';
    }
    if (error.name.includes('Timeout') || error.name.includes('Performance')) {
      return 'performance';
    }
    if (error.name.includes('Business') || error.name.includes('Validation')) {
      return 'business';
    }
    return 'application';
  }

  // Generate error tags
  private generateTags(error: Error, context: any): string[] {
    const tags = [error.name];
    
    if (context.url) {
      tags.push(`url:${context.url}`);
    }
    if (context.method) {
      tags.push(`method:${context.method}`);
    }
    if (context.userId) {
      tags.push('authenticated');
    }

    return tags;
  }

  // Clean up old errors
  private cleanupOldErrors(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    
    for (const [id, error] of this.errors) {
      if (error.lastSeen < cutoff && error.resolved) {
        this.errors.delete(id);
      }
    }

    logger.info('Old errors cleaned up', {
      remainingErrors: this.errors.size,
    });
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

  // Express error handling middleware
  errorHandlingMiddleware() {
    return (error: Error, req: Request, res: Response, next: Function) => {
      const errorId = this.trackError(error, {
        userId: (req as any).user?.id,
        sessionId: req.session?.id,
        requestId: (req as any).requestId,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      // Don't expose internal error details in production
      const isProduction = process.env.NODE_ENV === 'production';
      
      res.status(500).json({
        error: isProduction ? 'Internal server error' : error.message,
        errorId,
        timestamp: new Date().toISOString(),
      });
    };
  }

  // Add alert rule
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const alertRule: AlertRule = { ...rule, id };
    this.alertRules.push(alertRule);
    return id;
  }

  // Update alert rule
  updateAlertRule(id: string, updates: Partial<AlertRule>): boolean {
    const ruleIndex = this.alertRules.findIndex(r => r.id === id);
    if (ruleIndex === -1) return false;

    this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
    return true;
  }

  // Delete alert rule
  deleteAlertRule(id: string): boolean {
    const ruleIndex = this.alertRules.findIndex(r => r.id === id);
    if (ruleIndex === -1) return false;

    this.alertRules.splice(ruleIndex, 1);
    return true;
  }

  // Get alert rules
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }
}

export default ErrorTrackingService;