import { prisma, redis } from '@eu-real-estate/database';
import { AppError } from '../middleware/error-handler';
import { handlePrismaError } from '@eu-real-estate/database';
import { logger } from '../utils/logger';
import { EmailService } from './email.service';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

export interface DataExportRequest {
  userId: string;
  requestedBy: string;
  format: 'JSON' | 'CSV' | 'XML';
  includeTransactions?: boolean;
  includeMessages?: boolean;
  includeProperties?: boolean;
  includeSearchHistory?: boolean;
}

export interface DataDeletionRequest {
  userId: string;
  requestedBy: string;
  reason: string;
  retainLegalData?: boolean;
  deletionDate?: Date;
}

export interface ConsentRecord {
  userId: string;
  consentType: 'marketing' | 'analytics' | 'cookies' | 'data_processing' | 'third_party_sharing';
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  version: string;
}

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export class GDPRService {
  private static readonly EXPORT_RETENTION_DAYS = 30;
  private static readonly DELETION_GRACE_PERIOD_DAYS = 30;

  /**
   * Request data export for a user
   */
  static async requestDataExport(request: DataExportRequest): Promise<any> {
    try {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Create export request record
      const exportRequest = await prisma.dataExportRequest.create({
        data: {
          userId: request.userId,
          requestedById: request.requestedBy,
          format: request.format,
          status: 'PENDING',
          includeTransactions: request.includeTransactions || false,
          includeMessages: request.includeMessages || false,
          includeProperties: request.includeProperties || false,
          includeSearchHistory: request.includeSearchHistory || false,
          expiresAt: new Date(Date.now() + this.EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000),
        },
      });

      // Process export asynchronously
      this.processDataExport(exportRequest.id).catch(error => {
        logger.error('Data export processing error:', error);
      });

      // Log the request
      await this.logAuditEvent({
        userId: request.userId,
        action: 'DATA_EXPORT_REQUESTED',
        resource: 'user_data',
        resourceId: request.userId,
        newData: { exportRequestId: exportRequest.id, format: request.format },
        timestamp: new Date(),
      });

      return exportRequest;
    } catch (error) {
      logger.error('Request data export error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Process data export
   */
  private static async processDataExport(exportRequestId: string): Promise<void> {
    try {
      const exportRequest = await prisma.dataExportRequest.findUnique({
        where: { id: exportRequestId },
        include: { user: true },
      });

      if (!exportRequest) {
        throw new AppError('Export request not found', 404, 'EXPORT_REQUEST_NOT_FOUND');
      }

      // Update status to processing
      await prisma.dataExportRequest.update({
        where: { id: exportRequestId },
        data: { status: 'PROCESSING', processedAt: new Date() },
      });

      // Collect user data
      const userData = await this.collectUserData(exportRequest);

      // Generate export file
      const exportPath = await this.generateExportFile(userData, exportRequest);

      // Update export request with file path
      await prisma.dataExportRequest.update({
        where: { id: exportRequestId },
        data: {
          status: 'COMPLETED',
          filePath: exportPath,
          completedAt: new Date(),
        },
      });

      // Send notification to user
      await EmailService.sendEmail({
        to: exportRequest.user.email,
        subject: 'Your Data Export is Ready',
        html: `
          <h2>Data Export Completed</h2>
          <p>Dear ${exportRequest.user.firstName},</p>
          <p>Your requested data export has been completed and is ready for download.</p>
          <p>The export will be available for ${this.EXPORT_RETENTION_DAYS} days.</p>
          <p>You can download it from your account settings.</p>
          <hr>
          <p><small>This is an automated message from EU Real Estate Portal.</small></p>
        `,
      });

      logger.info(`Data export completed for user ${exportRequest.userId}`);
    } catch (error) {
      logger.error('Process data export error:', error);
      
      // Update status to failed
      await prisma.dataExportRequest.update({
        where: { id: exportRequestId },
        data: { status: 'FAILED', completedAt: new Date() },
      });
    }
  }

  /**
   * Collect user data for export
   */
  private static async collectUserData(exportRequest: any): Promise<Record<string, any>> {
    const userId = exportRequest.userId;
    const userData: Record<string, any> = {};

    // Basic user information (always included)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        preferences: true,
        verification: true,
      },
    });

    userData.user = {
      id: user?.id,
      email: user?.email,
      firstName: user?.firstName,
      lastName: user?.lastName,
      phone: user?.phone,
      role: user?.role,
      isVerified: user?.isVerified,
      createdAt: user?.createdAt,
      updatedAt: user?.updatedAt,
      profile: user?.profile,
      preferences: user?.preferences,
      verification: user?.verification,
    };

    // Properties (if requested)
    if (exportRequest.includeProperties) {
      userData.properties = await prisma.property.findMany({
        where: { ownerId: userId },
        include: {
          address: true,
          location: true,
          features: true,
          amenities: true,
          images: true,
          documents: true,
          tags: { include: { tag: true } },
        },
      });
    }

    // Transactions (if requested)
    if (exportRequest.includeTransactions) {
      userData.transactions = await prisma.transaction.findMany({
        where: {
          OR: [
            { buyerId: userId },
            { sellerId: userId },
            { agentId: userId },
          ],
        },
        include: {
          offers: true,
          documents: true,
          milestones: true,
          statusHistory: true,
        },
      });
    }

    // Messages (if requested)
    if (exportRequest.includeMessages) {
      userData.messages = await prisma.transactionMessage.findMany({
        where: {
          OR: [
            { senderId: userId },
            { recipientId: userId },
          ],
        },
        include: {
          attachments: true,
        },
      });
    }

    // Search history (if requested)
    if (exportRequest.includeSearchHistory) {
      userData.searchHistory = await prisma.searchLog.findMany({
        where: { userId },
      });

      userData.savedSearches = await prisma.savedSearch.findMany({
        where: { userId },
      });
    }

    // Favorites and other user data
    userData.favorites = await prisma.propertyFavorite.findMany({
      where: { userId },
      include: { property: { select: { id: true, title: true } } },
    });

    userData.notifications = await prisma.notification.findMany({
      where: { userId },
    });

    userData.reviews = await prisma.review.findMany({
      where: { reviewerId: userId },
    });

    // Consent records
    userData.consents = await prisma.consentRecord.findMany({
      where: { userId },
    });

    return userData;
  }

  /**
   * Generate export file
   */
  private static async generateExportFile(
    userData: Record<string, any>,
    exportRequest: any
  ): Promise<string> {
    const exportDir = path.join(process.cwd(), 'exports');
    const fileName = `user_data_${exportRequest.userId}_${Date.now()}`;
    
    // Ensure export directory exists
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    switch (exportRequest.format) {
      case 'JSON':
        const jsonPath = path.join(exportDir, `${fileName}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(userData, null, 2));
        return jsonPath;

      case 'CSV':
        // For CSV, we'll create a ZIP with multiple CSV files
        const csvZipPath = path.join(exportDir, `${fileName}.zip`);
        await this.createCSVExport(userData, csvZipPath);
        return csvZipPath;

      case 'XML':
        const xmlPath = path.join(exportDir, `${fileName}.xml`);
        const xmlContent = this.convertToXML(userData);
        fs.writeFileSync(xmlPath, xmlContent);
        return xmlPath;

      default:
        throw new AppError('Unsupported export format', 400, 'INVALID_FORMAT');
    }
  }

  /**
   * Create CSV export in ZIP format
   */
  private static async createCSVExport(userData: Record<string, any>, zipPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);

      // Convert each data type to CSV
      Object.entries(userData).forEach(([key, data]) => {
        if (Array.isArray(data) && data.length > 0) {
          const csv = this.convertToCSV(data);
          archive.append(csv, { name: `${key}.csv` });
        } else if (typeof data === 'object' && data !== null) {
          const csv = this.convertToCSV([data]);
          archive.append(csv, { name: `${key}.csv` });
        }
      });

      archive.finalize();
    });
  }

  /**
   * Convert data to CSV format
   */
  private static convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Convert data to XML format
   */
  private static convertToXML(data: Record<string, any>): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<user_data>\n';
    
    Object.entries(data).forEach(([key, value]) => {
      xml += `  <${key}>\n`;
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          xml += `    <item_${index}>\n`;
          xml += this.objectToXML(item, '      ');
          xml += `    </item_${index}>\n`;
        });
      } else if (typeof value === 'object' && value !== null) {
        xml += this.objectToXML(value, '    ');
      } else {
        xml += `    ${this.escapeXML(String(value))}\n`;
      }
      xml += `  </${key}>\n`;
    });
    
    xml += '</user_data>';
    return xml;
  }

  /**
   * Convert object to XML
   */
  private static objectToXML(obj: any, indent: string): string {
    let xml = '';
    Object.entries(obj).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      
      xml += `${indent}<${key}>`;
      if (typeof value === 'object') {
        xml += '\n' + this.objectToXML(value, indent + '  ') + indent;
      } else {
        xml += this.escapeXML(String(value));
      }
      xml += `</${key}>\n`;
    });
    return xml;
  }

  /**
   * Escape XML special characters
   */
  private static escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Request data deletion
   */
  static async requestDataDeletion(request: DataDeletionRequest): Promise<any> {
    try {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Create deletion request
      const deletionRequest = await prisma.dataDeletionRequest.create({
        data: {
          userId: request.userId,
          requestedById: request.requestedBy,
          reason: request.reason,
          retainLegalData: request.retainLegalData || false,
          status: 'PENDING',
          scheduledDeletionDate: request.deletionDate || 
            new Date(Date.now() + this.DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000),
        },
      });

      // Log the request
      await this.logAuditEvent({
        userId: request.userId,
        action: 'DATA_DELETION_REQUESTED',
        resource: 'user_data',
        resourceId: request.userId,
        newData: { deletionRequestId: deletionRequest.id, reason: request.reason },
        timestamp: new Date(),
      });

      // Send confirmation email
      await EmailService.sendEmail({
        to: user.email,
        subject: 'Data Deletion Request Received',
        html: `
          <h2>Data Deletion Request</h2>
          <p>Dear ${user.firstName},</p>
          <p>We have received your request to delete your personal data.</p>
          <p>Your data will be deleted on ${deletionRequest.scheduledDeletionDate?.toLocaleDateString()}.</p>
          <p>If you change your mind, you can cancel this request before the deletion date.</p>
          <hr>
          <p><small>This is an automated message from EU Real Estate Portal.</small></p>
        `,
      });

      return deletionRequest;
    } catch (error) {
      logger.error('Request data deletion error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Process data deletion
   */
  static async processDataDeletion(deletionRequestId: string): Promise<void> {
    try {
      const deletionRequest = await prisma.dataDeletionRequest.findUnique({
        where: { id: deletionRequestId },
        include: { user: true },
      });

      if (!deletionRequest) {
        throw new AppError('Deletion request not found', 404, 'DELETION_REQUEST_NOT_FOUND');
      }

      if (deletionRequest.status !== 'PENDING') {
        throw new AppError('Deletion request is not pending', 400, 'INVALID_STATUS');
      }

      // Update status to processing
      await prisma.dataDeletionRequest.update({
        where: { id: deletionRequestId },
        data: { status: 'PROCESSING', processedAt: new Date() },
      });

      // Perform deletion based on retention requirements
      if (deletionRequest.retainLegalData) {
        await this.performPartialDeletion(deletionRequest.userId);
      } else {
        await this.performFullDeletion(deletionRequest.userId);
      }

      // Update deletion request status
      await prisma.dataDeletionRequest.update({
        where: { id: deletionRequestId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      logger.info(`Data deletion completed for user ${deletionRequest.userId}`);
    } catch (error) {
      logger.error('Process data deletion error:', error);
      
      // Update status to failed
      await prisma.dataDeletionRequest.update({
        where: { id: deletionRequestId },
        data: { status: 'FAILED', completedAt: new Date() },
      });
    }
  }

  /**
   * Perform partial deletion (retain legal/compliance data)
   */
  private static async performPartialDeletion(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Anonymize user data
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@deleted.com`,
          firstName: 'Deleted',
          lastName: 'User',
          phone: null,
          avatar: null,
          isActive: false,
        },
      });

      // Delete profile data
      await tx.userProfile.deleteMany({ where: { userId } });
      
      // Delete preferences
      await tx.userPreferences.deleteMany({ where: { userId } });
      
      // Delete non-essential data
      await tx.propertyFavorite.deleteMany({ where: { userId } });
      await tx.savedSearch.deleteMany({ where: { userId } });
      await tx.searchLog.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      
      // Keep transaction and property data for legal compliance
      // but anonymize personal references
    });
  }

  /**
   * Perform full deletion
   */
  private static async performFullDeletion(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Delete all user-related data
      await tx.propertyFavorite.deleteMany({ where: { userId } });
      await tx.savedSearch.deleteMany({ where: { userId } });
      await tx.searchLog.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.review.deleteMany({ where: { reviewerId: userId } });
      await tx.consentRecord.deleteMany({ where: { userId } });
      
      // Delete user profile and preferences
      await tx.userProfile.deleteMany({ where: { userId } });
      await tx.userPreferences.deleteMany({ where: { userId } });
      await tx.userVerification.deleteMany({ where: { userId } });
      
      // Handle properties (transfer ownership or delete if no transactions)
      const properties = await tx.property.findMany({ where: { ownerId: userId } });
      for (const property of properties) {
        const hasTransactions = await tx.transaction.count({
          where: { propertyId: property.id },
        });
        
        if (hasTransactions > 0) {
          // Transfer to system user or anonymize
          await tx.property.update({
            where: { id: property.id },
            data: { ownerId: 'system' },
          });
        } else {
          // Delete property and related data
          await tx.property.delete({ where: { id: property.id } });
        }
      }
      
      // Finally delete user
      await tx.user.delete({ where: { id: userId } });
    });
  }

  /**
   * Record user consent
   */
  static async recordConsent(consent: ConsentRecord): Promise<any> {
    try {
      const consentRecord = await prisma.consentRecord.create({
        data: {
          userId: consent.userId,
          consentType: consent.consentType,
          granted: consent.granted,
          grantedAt: consent.granted ? (consent.grantedAt || new Date()) : null,
          revokedAt: !consent.granted ? (consent.revokedAt || new Date()) : null,
          ipAddress: consent.ipAddress,
          userAgent: consent.userAgent,
          version: consent.version,
        },
      });

      // Log consent change
      await this.logAuditEvent({
        userId: consent.userId,
        action: consent.granted ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
        resource: 'consent',
        resourceId: consentRecord.id,
        newData: { consentType: consent.consentType, granted: consent.granted },
        ipAddress: consent.ipAddress,
        userAgent: consent.userAgent,
        timestamp: new Date(),
      });

      return consentRecord;
    } catch (error) {
      logger.error('Record consent error:', error);
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get user consents
   */
  static async getUserConsents(userId: string): Promise<any[]> {
    try {
      return await prisma.consentRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Get user consents error:', error);
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Log audit event
   */
  static async logAuditEvent(event: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: event.userId,
          action: event.action,
          resource: event.resource,
          resourceId: event.resourceId,
          oldData: event.oldData ? JSON.stringify(event.oldData) : null,
          newData: event.newData ? JSON.stringify(event.newData) : null,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          createdAt: event.timestamp,
        },
      });
    } catch (error) {
      logger.error('Log audit event error:', error);
      // Don't throw error for audit logging failures
    }
  }

  /**
   * Get audit logs
   */
  static async getAuditLogs(
    filters: {
      userId?: string;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<any> {
    try {
      const { page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      const where: any = {};
      
      if (filters.userId) where.userId = filters.userId;
      if (filters.action) where.action = filters.action;
      if (filters.resource) where.resource = filters.resource;
      
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        logs: logs.map(log => ({
          ...log,
          oldData: log.oldData ? JSON.parse(log.oldData) : null,
          newData: log.newData ? JSON.parse(log.newData) : null,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get audit logs error:', error);
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Clean up expired export files
   */
  static async cleanupExpiredExports(): Promise<number> {
    try {
      const expiredExports = await prisma.dataExportRequest.findMany({
        where: {
          status: 'COMPLETED',
          expiresAt: { lt: new Date() },
        },
      });

      let cleanedCount = 0;

      for (const exportRequest of expiredExports) {
        try {
          // Delete file if it exists
          if (exportRequest.filePath && fs.existsSync(exportRequest.filePath)) {
            fs.unlinkSync(exportRequest.filePath);
          }

          // Update database record
          await prisma.dataExportRequest.update({
            where: { id: exportRequest.id },
            data: { status: 'EXPIRED', filePath: null },
          });

          cleanedCount++;
        } catch (error) {
          logger.error(`Error cleaning up export ${exportRequest.id}:`, error);
        }
      }

      logger.info(`Cleaned up ${cleanedCount} expired data exports`);
      return cleanedCount;
    } catch (error) {
      logger.error('Cleanup expired exports error:', error);
      return 0;
    }
  }
}