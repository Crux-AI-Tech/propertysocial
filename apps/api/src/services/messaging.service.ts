import { prisma, redis } from '@eu-real-estate/database';
import { AppError } from '../middleware/error-handler';
import { handlePrismaError, createPaginationParams, createPaginatedResult } from '@eu-real-estate/database';
import { logger } from '../utils/logger';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export interface MessageData {
  senderId: string;
  recipientId?: string;
  transactionId?: string;
  subject?: string;
  content: string;
  isInternal?: boolean;
  attachments?: {
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }[];
}

export interface MessageFilters {
  transactionId?: string;
  senderId?: string;
  recipientId?: string;
  isInternal?: boolean;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ConversationSummary {
  id: string;
  participants: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }[];
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
  transactionId?: string;
  property?: {
    id: string;
    title: string;
  };
}

export class MessagingService {
  private static io: SocketIOServer | null = null;
  private static connectedUsers = new Map<string, string>(); // userId -> socketId

  /**
   * Initialize WebSocket server
   */
  static initializeWebSocket(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', (data: { userId: string, token: string }) => {
        // TODO: Verify JWT token
        this.connectedUsers.set(data.userId, socket.id);
        socket.join(`user:${data.userId}`);
        logger.info(`User ${data.userId} authenticated and joined room`);
      });

      // Handle joining transaction rooms
      socket.on('join_transaction', (transactionId: string) => {
        socket.join(`transaction:${transactionId}`);
        logger.info(`Socket ${socket.id} joined transaction room: ${transactionId}`);
      });

      // Handle leaving transaction rooms
      socket.on('leave_transaction', (transactionId: string) => {
        socket.leave(`transaction:${transactionId}`);
        logger.info(`Socket ${socket.id} left transaction room: ${transactionId}`);
      });

      // Handle typing indicators
      socket.on('typing_start', (data: { transactionId?: string, recipientId?: string }) => {
        if (data.transactionId) {
          socket.to(`transaction:${data.transactionId}`).emit('user_typing', {
            userId: this.getUserIdBySocketId(socket.id),
            isTyping: true,
          });
        } else if (data.recipientId) {
          socket.to(`user:${data.recipientId}`).emit('user_typing', {
            userId: this.getUserIdBySocketId(socket.id),
            isTyping: true,
          });
        }
      });

      socket.on('typing_stop', (data: { transactionId?: string, recipientId?: string }) => {
        if (data.transactionId) {
          socket.to(`transaction:${data.transactionId}`).emit('user_typing', {
            userId: this.getUserIdBySocketId(socket.id),
            isTyping: false,
          });
        } else if (data.recipientId) {
          socket.to(`user:${data.recipientId}`).emit('user_typing', {
            userId: this.getUserIdBySocketId(socket.id),
            isTyping: false,
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        const userId = this.getUserIdBySocketId(socket.id);
        if (userId) {
          this.connectedUsers.delete(userId);
        }
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Send a message
   */
  static async sendMessage(messageData: MessageData): Promise<any> {
    try {
      // Validate sender exists
      const sender = await prisma.user.findUnique({
        where: { id: messageData.senderId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      });

      if (!sender) {
        throw new AppError('Sender not found', 404, 'SENDER_NOT_FOUND');
      }

      // Validate recipient if specified
      let recipient = null;
      if (messageData.recipientId) {
        recipient = await prisma.user.findUnique({
          where: { id: messageData.recipientId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        });

        if (!recipient) {
          throw new AppError('Recipient not found', 404, 'RECIPIENT_NOT_FOUND');
        }
      }

      // Validate transaction if specified
      let transaction = null;
      if (messageData.transactionId) {
        transaction = await prisma.transaction.findUnique({
          where: { id: messageData.transactionId },
          include: {
            property: {
              select: { id: true, title: true },
            },
          },
        });

        if (!transaction) {
          throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
        }

        // Check if sender has access to transaction
        const hasAccess = 
          transaction.buyerId === messageData.senderId ||
          transaction.sellerId === messageData.senderId ||
          transaction.agentId === messageData.senderId;

        if (!hasAccess) {
          throw new AppError('Not authorized to send messages in this transaction', 403, 'UNAUTHORIZED');
        }
      }

      // Create message
      const message = await prisma.$transaction(async (tx) => {
        const newMessage = await tx.transactionMessage.create({
          data: {
            transactionId: messageData.transactionId,
            senderId: messageData.senderId,
            recipientId: messageData.recipientId,
            subject: messageData.subject,
            content: messageData.content,
            isInternal: messageData.isInternal || false,
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            recipient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            transaction: {
              include: {
                property: {
                  select: { id: true, title: true },
                },
              },
            },
          },
        });

        // Create attachments if provided
        if (messageData.attachments && messageData.attachments.length > 0) {
          await Promise.all(
            messageData.attachments.map(attachment =>
              tx.messageAttachment.create({
                data: {
                  messageId: newMessage.id,
                  fileName: attachment.fileName,
                  fileUrl: attachment.fileUrl,
                  fileSize: attachment.fileSize,
                  mimeType: attachment.mimeType,
                },
              })
            )
          );
        }

        return newMessage;
      });

      // Get message with attachments
      const messageWithAttachments = await prisma.transactionMessage.findUnique({
        where: { id: message.id },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          recipient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          attachments: true,
          transaction: {
            include: {
              property: {
                select: { id: true, title: true },
              },
            },
          },
        },
      });

      // Send real-time notification
      await this.broadcastMessage(messageWithAttachments!);

      return messageWithAttachments;
    } catch (error) {
      logger.error('Send message error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get messages with filters
   */
  static async getMessages(filters: MessageFilters, userId: string): Promise<any> {
    try {
      const { skip, take, page, limit } = createPaginationParams({
        page: filters.page,
        limit: filters.limit,
      });

      const where: any = {
        OR: [
          { senderId: userId },
          { recipientId: userId },
        ],
      };

      // Apply filters
      if (filters.transactionId) {
        where.transactionId = filters.transactionId;
      }

      if (filters.senderId) {
        where.senderId = filters.senderId;
      }

      if (filters.recipientId) {
        where.recipientId = filters.recipientId;
      }

      if (filters.isInternal !== undefined) {
        where.isInternal = filters.isInternal;
      }

      if (filters.unreadOnly) {
        where.readAt = null;
        where.recipientId = userId;
      }

      const orderBy = {
        [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc',
      };

      const [messages, total] = await Promise.all([
        prisma.transactionMessage.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            recipient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            attachments: true,
            transaction: {
              include: {
                property: {
                  select: { id: true, title: true },
                },
              },
            },
          },
        }),
        prisma.transactionMessage.count({ where }),
      ]);

      return createPaginatedResult(messages, total, page, limit);
    } catch (error) {
      logger.error('Get messages error:', error);
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get conversation summaries for a user
   */
  static async getConversations(userId: string): Promise<ConversationSummary[]> {
    try {
      // Get all transactions where user is involved
      const transactions = await prisma.transaction.findMany({
        where: {
          OR: [
            { buyerId: userId },
            { sellerId: userId },
            { agentId: userId },
          ],
        },
        include: {
          property: {
            select: { id: true, title: true },
          },
          buyer: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          seller: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          agent: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          _count: {
            select: {
              messages: {
                where: {
                  recipientId: userId,
                  readAt: null,
                },
              },
            },
          },
        },
      });

      const conversations: ConversationSummary[] = transactions
        .filter(transaction => transaction.messages.length > 0)
        .map(transaction => {
          const participants = [
            transaction.buyer,
            transaction.seller,
            transaction.agent,
          ].filter(Boolean) as any[];

          const lastMessage = transaction.messages[0];

          return {
            id: transaction.id,
            participants,
            lastMessage: {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt.toISOString(),
              senderId: lastMessage.senderId,
            },
            unreadCount: transaction._count.messages,
            transactionId: transaction.id,
            property: transaction.property,
          };
        });

      return conversations.sort((a, b) => 
        new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
      );
    } catch (error) {
      logger.error('Get conversations error:', error);
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Mark message as read
   */
  static async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    try {
      const message = await prisma.transactionMessage.findFirst({
        where: {
          id: messageId,
          recipientId: userId,
        },
      });

      if (!message) {
        throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
      }

      await prisma.transactionMessage.update({
        where: { id: messageId },
        data: { readAt: new Date() },
      });

      // Notify sender that message was read
      if (this.io && message.senderId) {
        this.io.to(`user:${message.senderId}`).emit('message_read', {
          messageId,
          readBy: userId,
          readAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Mark message as read error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Mark all messages in a conversation as read
   */
  static async markConversationAsRead(transactionId: string, userId: string): Promise<void> {
    try {
      await prisma.transactionMessage.updateMany({
        where: {
          transactionId,
          recipientId: userId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      // Notify other participants
      if (this.io) {
        this.io.to(`transaction:${transactionId}`).emit('conversation_read', {
          transactionId,
          readBy: userId,
          readAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Mark conversation as read error:', error);
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Delete message
   */
  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const message = await prisma.transactionMessage.findFirst({
        where: {
          id: messageId,
          senderId: userId,
        },
      });

      if (!message) {
        throw new AppError('Message not found or not authorized', 404, 'MESSAGE_NOT_FOUND');
      }

      // Delete attachments first
      await prisma.messageAttachment.deleteMany({
        where: { messageId },
      });

      // Delete message
      await prisma.transactionMessage.delete({
        where: { id: messageId },
      });

      // Notify participants
      if (this.io && message.transactionId) {
        this.io.to(`transaction:${message.transactionId}`).emit('message_deleted', {
          messageId,
          deletedBy: userId,
        });
      }
    } catch (error) {
      logger.error('Delete message error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get online users
   */
  static getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Check if user is online
   */
  static isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Broadcast message to relevant users
   */
  private static async broadcastMessage(message: any): Promise<void> {
    if (!this.io) return;

    try {
      // Broadcast to transaction room if transaction-related
      if (message.transactionId) {
        this.io.to(`transaction:${message.transactionId}`).emit('new_message', message);
      }

      // Send to specific recipient
      if (message.recipientId) {
        this.io.to(`user:${message.recipientId}`).emit('new_message', message);
      }

      // Send to sender for confirmation
      this.io.to(`user:${message.senderId}`).emit('message_sent', {
        tempId: message.tempId, // If provided by client
        message,
      });
    } catch (error) {
      logger.error('Broadcast message error:', error);
    }
  }

  /**
   * Get user ID by socket ID
   */
  private static getUserIdBySocketId(socketId: string): string | undefined {
    for (const [userId, userSocketId] of this.connectedUsers.entries()) {
      if (userSocketId === socketId) {
        return userId;
      }
    }
    return undefined;
  }

  /**
   * Send system message
   */
  static async sendSystemMessage(
    transactionId: string,
    content: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        select: {
          buyerId: true,
          sellerId: true,
          agentId: true,
        },
      });

      if (!transaction) return;

      // Create system message
      const message = await prisma.transactionMessage.create({
        data: {
          transactionId,
          senderId: 'system', // Special system user ID
          content,
          isInternal: true,
        },
      });

      // Broadcast to transaction participants
      if (this.io) {
        this.io.to(`transaction:${transactionId}`).emit('system_message', {
          ...message,
          data,
        });
      }
    } catch (error) {
      logger.error('Send system message error:', error);
    }
  }
}