import { prisma, redis } from '@eu-real-estate/database';
import { NotificationType, NotificationStatus } from '@eu-real-estate/database';
import { AppError } from '../middleware/error-handler';
import { handlePrismaError } from '@eu-real-estate/database';
import { logger } from '../utils/logger';
import { EmailService } from './email.service';

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
  expiresAt?: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  emailTemplate: string;
  smsTemplate: string;
  pushTemplate: string;
  variables: string[];
}

export interface BulkNotificationData {
  userIds: string[];
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, any>;
  templateId?: string;
  templateVariables?: Record<string, any>;
}

export class NotificationService {
  private static readonly NOTIFICATION_CACHE_TTL = 3600; // 1 hour
  private static readonly BATCH_SIZE = 100;

  /**
   * Send a single notification
   */
  static async sendNotification(notificationData: NotificationData): Promise<any> {
    try {
      // Get user preferences
      const user = await prisma.user.findUnique({
        where: { id: notificationData.userId },
        include: { preferences: true },
      });

      if (!user || !user.isActive) {
        throw new AppError('User not found or inactive', 404, 'USER_NOT_FOUND');
      }

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          userId: notificationData.userId,
          type: notificationData.type,
          status: NotificationStatus.PENDING,
          title: notificationData.title,
          content: notificationData.content,
          data: notificationData.data ? JSON.stringify(notificationData.data) : null,
        },
      });

      // Send notification based on type and user preferences
      const results = await this.deliverNotification(notification, user, notificationData);

      // Update notification status
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: results.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
          sentAt: results.success ? new Date() : null,
        },
      });

      return {
        ...notification,
        deliveryResults: results,
      };
    } catch (error) {
      logger.error('Send notification error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'NOTIFICATION_ERROR');
    }
  }

  /**
   * Send bulk notifications
   */
  static async sendBulkNotifications(bulkData: BulkNotificationData): Promise<any> {
    try {
      const results = {
        total: bulkData.userIds.length,
        sent: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Process in batches
      for (let i = 0; i < bulkData.userIds.length; i += this.BATCH_SIZE) {
        const batch = bulkData.userIds.slice(i, i + this.BATCH_SIZE);
        
        const batchPromises = batch.map(async (userId) => {
          try {
            await this.sendNotification({
              userId,
              type: bulkData.type,
              title: bulkData.title,
              content: bulkData.content,
              data: bulkData.data,
            });
            results.sent++;
          } catch (error) {
            results.failed++;
            results.errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            logger.error(`Bulk notification error for user ${userId}:`, error);
          }
        });

        await Promise.allSettled(batchPromises);
      }

      return results;
    } catch (error) {
      logger.error('Bulk notification error:', error);
      throw new AppError('Failed to send bulk notifications', 500, 'BULK_NOTIFICATION_ERROR');
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {}
  ): Promise<any> {
    try {
      const { page = 1, limit = 20, unreadOnly = false, type } = options;
      const skip = (page - 1) * limit;

      const where: any = { userId };
      
      if (unreadOnly) {
        where.readAt = null;
      }
      
      if (type) {
        where.type = type;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: { userId, readAt: null },
        }),
      ]);

      return {
        notifications: notifications.map(notification => ({
          ...notification,
          data: notification.data ? JSON.parse(notification.data) : null,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      };
    } catch (error) {
      logger.error('Get user notifications error:', error);
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
      });

      // Clear cache
      await redis.del(`notifications:${userId}`);
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });

      // Clear cache
      await redis.del(`notifications:${userId}`);
    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const result = await prisma.notification.deleteMany({
        where: { id: notificationId, userId },
      });

      if (result.count === 0) {
        throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
      }

      // Clear cache
      await redis.del(`notifications:${userId}`);
    } catch (error) {
      logger.error('Delete notification error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Send property-related notifications
   */
  static async sendPropertyNotification(
    propertyId: string,
    type: 'new_listing' | 'price_change' | 'status_change' | 'saved_search_match',
    data: Record<string, any> = {}
  ): Promise<void> {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          address: true,
          owner: true,
        },
      });

      if (!property) return;

      let userIds: string[] = [];
      let title = '';
      let content = '';

      switch (type) {
        case 'new_listing':
          // Notify users with saved searches that match this property
          const matchingSearches = await this.findMatchingSavedSearches(property);
          userIds = matchingSearches.map(search => search.userId);
          title = 'New Property Match';
          content = `A new property matching your saved search is available: ${property.title}`;
          break;

        case 'price_change':
          // Notify users who favorited this property
          const favorites = await prisma.propertyFavorite.findMany({
            where: { propertyId },
            select: { userId: true },
          });
          userIds = favorites.map(fav => fav.userId);
          title = 'Price Change Alert';
          content = `The price for "${property.title}" has been updated`;
          break;

        case 'status_change':
          // Notify interested parties
          const interestedUsers = await prisma.propertyFavorite.findMany({
            where: { propertyId },
            select: { userId: true },
          });
          userIds = interestedUsers.map(user => user.userId);
          title = 'Property Status Update';
          content = `The status of "${property.title}" has changed`;
          break;
      }

      if (userIds.length > 0) {
        await this.sendBulkNotifications({
          userIds,
          type: NotificationType.PUSH,
          title,
          content,
          data: { propertyId, type, ...data },
        });
      }
    } catch (error) {
      logger.error('Send property notification error:', error);
    }
  }

  /**
   * Send transaction-related notifications
   */
  static async sendTransactionNotification(
    transactionId: string,
    type: 'new_offer' | 'offer_response' | 'status_change' | 'milestone_completed' | 'document_uploaded',
    recipientIds: string[],
    data: Record<string, any> = {}
  ): Promise<void> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          property: { select: { title: true } },
        },
      });

      if (!transaction) return;

      let title = '';
      let content = '';

      switch (type) {
        case 'new_offer':
          title = 'New Offer Received';
          content = `You have received a new offer for "${transaction.property.title}"`;
          break;
        case 'offer_response':
          title = 'Offer Response';
          content = `Your offer for "${transaction.property.title}" has been responded to`;
          break;
        case 'status_change':
          title = 'Transaction Update';
          content = `The status of your transaction for "${transaction.property.title}" has changed`;
          break;
        case 'milestone_completed':
          title = 'Milestone Completed';
          content = `A milestone has been completed for "${transaction.property.title}"`;
          break;
        case 'document_uploaded':
          title = 'New Document';
          content = `A new document has been uploaded for "${transaction.property.title}"`;
          break;
      }

      await this.sendBulkNotifications({
        userIds: recipientIds,
        type: NotificationType.PUSH,
        title,
        content,
        data: { transactionId, type, ...data },
      });
    } catch (error) {
      logger.error('Send transaction notification error:', error);
    }
  }

  /**
   * Deliver notification based on type and user preferences
   */
  private static async deliverNotification(
    notification: any,
    user: any,
    notificationData: NotificationData
  ): Promise<{ success: boolean; results: Record<string, any> }> {
    const results: Record<string, any> = {};
    let overallSuccess = false;

    try {
      switch (notificationData.type) {
        case NotificationType.EMAIL:
          if (user.preferences?.emailNotifications) {
            results.email = await this.sendEmailNotification(user, notification);
            overallSuccess = results.email.success;
          }
          break;

        case NotificationType.SMS:
          if (user.preferences?.smsNotifications && user.phone) {
            results.sms = await this.sendSMSNotification(user, notification);
            overallSuccess = results.sms.success;
          }
          break;

        case NotificationType.PUSH:
          if (user.preferences?.pushNotifications) {
            results.push = await this.sendPushNotification(user, notification);
            overallSuccess = results.push.success;
          }
          break;

        case NotificationType.IN_APP:
          // In-app notifications are stored in database only
          results.inApp = { success: true };
          overallSuccess = true;
          break;
      }
    } catch (error) {
      logger.error('Notification delivery error:', error);
      results.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return { success: overallSuccess, results };
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(user: any, notification: any): Promise<any> {
    try {
      await EmailService.sendEmail({
        to: user.email,
        subject: notification.title,
        html: `
          <h2>${notification.title}</h2>
          <p>${notification.content}</p>
          <hr>
          <p><small>This is an automated notification from EU Real Estate Portal.</small></p>
        `,
      });

      return { success: true };
    } catch (error) {
      logger.error('Email notification error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send SMS notification
   */
  private static async sendSMSNotification(user: any, notification: any): Promise<any> {
    try {
      // TODO: Implement SMS service integration (Twilio, AWS SNS, etc.)
      // For now, we'll simulate SMS sending
      logger.info(`SMS notification sent to ${user.phone}: ${notification.title}`);
      
      return { success: true, provider: 'simulated' };
    } catch (error) {
      logger.error('SMS notification error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(user: any, notification: any): Promise<any> {
    try {
      // TODO: Implement push notification service (Firebase, OneSignal, etc.)
      // For now, we'll simulate push notification sending
      logger.info(`Push notification sent to user ${user.id}: ${notification.title}`);
      
      return { success: true, provider: 'simulated' };
    } catch (error) {
      logger.error('Push notification error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Find saved searches that match a property
   */
  private static async findMatchingSavedSearches(property: any): Promise<any[]> {
    try {
      const savedSearches = await prisma.savedSearch.findMany({
        where: { isActive: true },
      });

      const matchingSearches = [];

      for (const search of savedSearches) {
        const criteria = JSON.parse(search.criteria);
        
        // Simple matching logic - can be enhanced
        let matches = true;
        
        if (criteria.propertyType && criteria.propertyType !== property.propertyType) {
          matches = false;
        }
        
        if (criteria.listingType && criteria.listingType !== property.listingType) {
          matches = false;
        }
        
        if (criteria.minPrice && property.price < criteria.minPrice) {
          matches = false;
        }
        
        if (criteria.maxPrice && property.price > criteria.maxPrice) {
          matches = false;
        }
        
        if (criteria.city && property.address?.city !== criteria.city) {
          matches = false;
        }
        
        if (matches) {
          matchingSearches.push(search);
        }
      }

      return matchingSearches;
    } catch (error) {
      logger.error('Find matching saved searches error:', error);
      return [];
    }
  }

  /**
   * Clean up old notifications
   */
  static async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          readAt: { not: null },
        },
      });

      logger.info(`Cleaned up ${result.count} old notifications`);
      return result.count;
    } catch (error) {
      logger.error('Cleanup old notifications error:', error);
      return 0;
    }
  }
}