import { prisma, redis } from '@eu-real-estate/database';
import { TransactionStatus, TransactionType, OfferStatus, DocumentType, DocumentStatus } from '@eu-real-estate/database';
import { AppError } from '../middleware/error-handler';
import { handlePrismaError, createPaginationParams, createOrderBy, createPaginatedResult } from '@eu-real-estate/database';
import { logger } from '../utils/logger';

export interface CreateTransactionData {
  propertyId: string;
  sellerId: string;
  buyerId?: string;
  agentId?: string;
  type: TransactionType;
  offerAmount?: number;
  currency?: string;
  notes?: string;
  terms?: Record<string, any>;
  expectedCompletion?: Date;
}

export interface UpdateTransactionData {
  status?: TransactionStatus;
  finalAmount?: number;
  commission?: number;
  commissionRate?: number;
  notes?: string;
  terms?: Record<string, any>;
  expectedCompletion?: Date;
}

export interface CreateOfferData {
  transactionId: string;
  offererId: string;
  amount: number;
  currency?: string;
  message?: string;
  conditions?: Record<string, any>;
  validUntil?: Date;
}

export interface CreateMilestoneData {
  transactionId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  isRequired?: boolean;
  order?: number;
}

export interface TransactionFilters {
  status?: TransactionStatus[];
  type?: TransactionType;
  propertyId?: string;
  buyerId?: string;
  sellerId?: string;
  agentId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class TransactionService {
  /**
   * Create a new transaction
   */
  static async createTransaction(data: CreateTransactionData, userId: string): Promise<any> {
    try {
      // Verify property exists and user has permission
      const property = await prisma.property.findUnique({
        where: { id: data.propertyId },
        include: { owner: true },
      });

      if (!property) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      // Check if user is authorized to create transaction
      if (property.ownerId !== userId && data.sellerId !== userId && data.agentId !== userId) {
        throw new AppError('Not authorized to create transaction for this property', 403, 'UNAUTHORIZED');
      }

      // Create transaction with initial milestones
      const transaction = await prisma.$transaction(async (tx) => {
        const newTransaction = await tx.transaction.create({
          data: {
            propertyId: data.propertyId,
            sellerId: data.sellerId,
            buyerId: data.buyerId,
            agentId: data.agentId,
            type: data.type,
            offerAmount: data.offerAmount,
            currency: data.currency || 'EUR',
            notes: data.notes,
            terms: data.terms ? JSON.stringify(data.terms) : null,
            expectedCompletion: data.expectedCompletion,
          },
          include: {
            property: {
              include: {
                address: true,
                features: true,
                images: { where: { isMain: true }, take: 1 },
              },
            },
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            seller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            agent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        });

        // Create default milestones based on transaction type
        const defaultMilestones = this.getDefaultMilestones(data.type);
        for (const milestone of defaultMilestones) {
          await tx.transactionMilestone.create({
            data: {
              transactionId: newTransaction.id,
              ...milestone,
            },
          });
        }

        // Log status change
        await tx.transactionStatusHistory.create({
          data: {
            transactionId: newTransaction.id,
            previousStatus: TransactionStatus.DRAFT,
            newStatus: TransactionStatus.DRAFT,
            changedById: userId,
            reason: 'Transaction created',
          },
        });

        return newTransaction;
      });

      // Clear related caches
      await this.clearTransactionCaches(transaction.id);

      return transaction;
    } catch (error) {
      logger.error('Create transaction error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(id: string, userId: string): Promise<any> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          property: {
            include: {
              address: true,
              features: true,
              images: { where: { isMain: true }, take: 1 },
            },
          },
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
          offers: {
            include: {
              offerer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          documents: {
            include: {
              uploadedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              signedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          milestones: {
            include: {
              completedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
          statusHistory: {
            include: {
              changedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!transaction) {
        throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
      }

      // Check if user has access to this transaction
      const hasAccess = 
        transaction.buyerId === userId ||
        transaction.sellerId === userId ||
        transaction.agentId === userId ||
        transaction.property.ownerId === userId;

      if (!hasAccess) {
        throw new AppError('Not authorized to view this transaction', 403, 'UNAUTHORIZED');
      }

      // Parse JSON fields
      return {
        ...transaction,
        terms: transaction.terms ? JSON.parse(transaction.terms) : null,
        offers: transaction.offers.map(offer => ({
          ...offer,
          conditions: offer.conditions ? JSON.parse(offer.conditions) : null,
        })),
      };
    } catch (error) {
      logger.error('Get transaction error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Update transaction
   */
  static async updateTransaction(
    id: string,
    data: UpdateTransactionData,
    userId: string
  ): Promise<any> {
    try {
      // Get current transaction
      const currentTransaction = await prisma.transaction.findUnique({
        where: { id },
        include: { property: true },
      });

      if (!currentTransaction) {
        throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
      }

      // Check authorization
      const hasAccess = 
        currentTransaction.buyerId === userId ||
        currentTransaction.sellerId === userId ||
        currentTransaction.agentId === userId ||
        currentTransaction.property.ownerId === userId;

      if (!hasAccess) {
        throw new AppError('Not authorized to update this transaction', 403, 'UNAUTHORIZED');
      }

      const transaction = await prisma.$transaction(async (tx) => {
        const updatedTransaction = await tx.transaction.update({
          where: { id },
          data: {
            ...data,
            terms: data.terms ? JSON.stringify(data.terms) : undefined,
            updatedAt: new Date(),
          },
          include: {
            property: {
              include: {
                address: true,
                features: true,
                images: { where: { isMain: true }, take: 1 },
              },
            },
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            seller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            agent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        });

        // Log status change if status was updated
        if (data.status && data.status !== currentTransaction.status) {
          await tx.transactionStatusHistory.create({
            data: {
              transactionId: id,
              previousStatus: currentTransaction.status,
              newStatus: data.status,
              changedById: userId,
              reason: 'Status updated',
            },
          });

          // Update property status based on transaction status
          if (data.status === TransactionStatus.COMPLETED) {
            const newPropertyStatus = currentTransaction.type === TransactionType.PURCHASE ? 'SOLD' : 'RENTED';
            await tx.property.update({
              where: { id: currentTransaction.propertyId },
              data: { status: newPropertyStatus as any },
            });
          }
        }

        return updatedTransaction;
      });

      // Clear caches
      await this.clearTransactionCaches(id);

      return {
        ...transaction,
        terms: transaction.terms ? JSON.parse(transaction.terms) : null,
      };
    } catch (error) {
      logger.error('Update transaction error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get transactions with filters
   */
  static async getTransactions(filters: TransactionFilters, userId: string): Promise<any> {
    try {
      const { skip, take, page, limit } = createPaginationParams({
        page: filters.page,
        limit: filters.limit,
      });

      const where: any = {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
          { agentId: userId },
          { property: { ownerId: userId } },
        ],
      };

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        where.status = { in: filters.status };
      }

      if (filters.type) {
        where.type = filters.type;
      }

      if (filters.propertyId) {
        where.propertyId = filters.propertyId;
      }

      if (filters.buyerId) {
        where.buyerId = filters.buyerId;
      }

      if (filters.sellerId) {
        where.sellerId = filters.sellerId;
      }

      if (filters.agentId) {
        where.agentId = filters.agentId;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.lte = filters.dateTo;
      }

      const orderBy = createOrderBy(
        filters.sortBy || 'createdAt',
        filters.sortOrder || 'desc'
      );

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            property: {
              include: {
                address: true,
                images: { where: { isMain: true }, take: 1 },
              },
            },
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            seller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            agent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: {
                offers: true,
                documents: true,
                messages: true,
              },
            },
          },
        }),
        prisma.transaction.count({ where }),
      ]);

      return createPaginatedResult(
        transactions.map(transaction => ({
          ...transaction,
          terms: transaction.terms ? JSON.parse(transaction.terms) : null,
        })),
        total,
        page,
        limit
      );
    } catch (error) {
      logger.error('Get transactions error:', error);
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Create an offer
   */
  static async createOffer(data: CreateOfferData, userId: string): Promise<any> {
    try {
      // Verify transaction exists and user has permission
      const transaction = await prisma.transaction.findUnique({
        where: { id: data.transactionId },
        include: { property: true },
      });

      if (!transaction) {
        throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
      }

      // Check if user can make an offer
      const canMakeOffer = 
        transaction.buyerId === userId ||
        transaction.sellerId === userId ||
        transaction.agentId === userId ||
        transaction.property.ownerId === userId;

      if (!canMakeOffer) {
        throw new AppError('Not authorized to make offer on this transaction', 403, 'UNAUTHORIZED');
      }

      const offer = await prisma.offer.create({
        data: {
          transactionId: data.transactionId,
          offererId: data.offererId,
          amount: data.amount,
          currency: data.currency || 'EUR',
          message: data.message,
          conditions: data.conditions ? JSON.stringify(data.conditions) : null,
          validUntil: data.validUntil,
        },
        include: {
          offerer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          transaction: {
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      // Update transaction status if needed
      if (transaction.status === TransactionStatus.DRAFT) {
        await prisma.transaction.update({
          where: { id: data.transactionId },
          data: { status: TransactionStatus.PENDING },
        });
      }

      return {
        ...offer,
        conditions: offer.conditions ? JSON.parse(offer.conditions) : null,
      };
    } catch (error) {
      logger.error('Create offer error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Respond to an offer
   */
  static async respondToOffer(
    offerId: string,
    status: OfferStatus,
    userId: string,
    counterOfferData?: Partial<CreateOfferData>
  ): Promise<any> {
    try {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: {
          transaction: {
            include: { property: true },
          },
        },
      });

      if (!offer) {
        throw new AppError('Offer not found', 404, 'OFFER_NOT_FOUND');
      }

      // Check authorization
      const canRespond = 
        offer.transaction.buyerId === userId ||
        offer.transaction.sellerId === userId ||
        offer.transaction.agentId === userId ||
        offer.transaction.property.ownerId === userId;

      if (!canRespond) {
        throw new AppError('Not authorized to respond to this offer', 403, 'UNAUTHORIZED');
      }

      const result = await prisma.$transaction(async (tx) => {
        // Update offer status
        const updatedOffer = await tx.offer.update({
          where: { id: offerId },
          data: {
            status,
            respondedAt: new Date(),
          },
          include: {
            offerer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

        let counterOffer = null;

        // Create counter offer if status is COUNTERED
        if (status === OfferStatus.COUNTERED && counterOfferData) {
          counterOffer = await tx.offer.create({
            data: {
              transactionId: offer.transactionId,
              offererId: userId,
              amount: counterOfferData.amount!,
              currency: counterOfferData.currency || 'EUR',
              message: counterOfferData.message,
              conditions: counterOfferData.conditions ? JSON.stringify(counterOfferData.conditions) : null,
              validUntil: counterOfferData.validUntil,
              parentOfferId: offerId,
            },
            include: {
              offerer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          });
        }

        // Update transaction status if offer is accepted
        if (status === OfferStatus.ACCEPTED) {
          await tx.transaction.update({
            where: { id: offer.transactionId },
            data: {
              status: TransactionStatus.ACCEPTED,
              finalAmount: offer.amount,
              acceptedDate: new Date(),
            },
          });
        }

        return { updatedOffer, counterOffer };
      });

      return {
        offer: {
          ...result.updatedOffer,
          conditions: result.updatedOffer.conditions ? JSON.parse(result.updatedOffer.conditions) : null,
        },
        counterOffer: result.counterOffer ? {
          ...result.counterOffer,
          conditions: result.counterOffer.conditions ? JSON.parse(result.counterOffer.conditions) : null,
        } : null,
      };
    } catch (error) {
      logger.error('Respond to offer error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Upload transaction document
   */
  static async uploadDocument(
    transactionId: string,
    uploadedById: string,
    documentData: {
      type: DocumentType;
      title: string;
      description?: string;
      fileName: string;
      fileUrl: string;
      fileSize?: number;
      mimeType?: string;
      requiresSignature?: boolean;
      expiresAt?: Date;
    }
  ): Promise<any> {
    try {
      // Verify transaction exists and user has permission
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { property: true },
      });

      if (!transaction) {
        throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
      }

      const hasAccess = 
        transaction.buyerId === uploadedById ||
        transaction.sellerId === uploadedById ||
        transaction.agentId === uploadedById ||
        transaction.property.ownerId === uploadedById;

      if (!hasAccess) {
        throw new AppError('Not authorized to upload documents to this transaction', 403, 'UNAUTHORIZED');
      }

      const document = await prisma.transactionDocument.create({
        data: {
          transactionId,
          uploadedById,
          type: documentData.type,
          status: DocumentStatus.UPLOADED,
          title: documentData.title,
          description: documentData.description,
          fileName: documentData.fileName,
          fileUrl: documentData.fileUrl,
          fileSize: documentData.fileSize,
          mimeType: documentData.mimeType,
          requiresSignature: documentData.requiresSignature || false,
          expiresAt: documentData.expiresAt,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return document;
    } catch (error) {
      logger.error('Upload document error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Complete milestone
   */
  static async completeMilestone(
    milestoneId: string,
    userId: string
  ): Promise<any> {
    try {
      const milestone = await prisma.transactionMilestone.findUnique({
        where: { id: milestoneId },
        include: {
          transaction: {
            include: { property: true },
          },
        },
      });

      if (!milestone) {
        throw new AppError('Milestone not found', 404, 'MILESTONE_NOT_FOUND');
      }

      // Check authorization
      const hasAccess = 
        milestone.transaction.buyerId === userId ||
        milestone.transaction.sellerId === userId ||
        milestone.transaction.agentId === userId ||
        milestone.transaction.property.ownerId === userId;

      if (!hasAccess) {
        throw new AppError('Not authorized to complete this milestone', 403, 'UNAUTHORIZED');
      }

      const updatedMilestone = await prisma.transactionMilestone.update({
        where: { id: milestoneId },
        data: {
          completedAt: new Date(),
          completedById: userId,
        },
        include: {
          completedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return updatedMilestone;
    } catch (error) {
      logger.error('Complete milestone error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get default milestones for transaction type
   */
  private static getDefaultMilestones(type: TransactionType): CreateMilestoneData[] {
    const baseMilestones = [
      {
        title: 'Initial Offer',
        description: 'Submit initial offer for the property',
        order: 1,
        isRequired: true,
      },
      {
        title: 'Offer Acceptance',
        description: 'Offer accepted by seller',
        order: 2,
        isRequired: true,
      },
      {
        title: 'Documentation Review',
        description: 'Review and upload required documents',
        order: 3,
        isRequired: true,
      },
    ];

    if (type === TransactionType.PURCHASE) {
      return [
        ...baseMilestones,
        {
          title: 'Property Inspection',
          description: 'Conduct property inspection',
          order: 4,
          isRequired: true,
        },
        {
          title: 'Mortgage Approval',
          description: 'Obtain mortgage approval',
          order: 5,
          isRequired: false,
        },
        {
          title: 'Final Walkthrough',
          description: 'Final property walkthrough',
          order: 6,
          isRequired: true,
        },
        {
          title: 'Closing',
          description: 'Complete property purchase',
          order: 7,
          isRequired: true,
        },
      ];
    } else {
      return [
        ...baseMilestones,
        {
          title: 'Lease Agreement',
          description: 'Sign lease agreement',
          order: 4,
          isRequired: true,
        },
        {
          title: 'Security Deposit',
          description: 'Pay security deposit',
          order: 5,
          isRequired: true,
        },
        {
          title: 'Move-in Inspection',
          description: 'Conduct move-in inspection',
          order: 6,
          isRequired: true,
        },
      ];
    }
  }

  /**
   * Clear transaction-related caches
   */
  private static async clearTransactionCaches(transactionId: string): Promise<void> {
    try {
      const keys = await redis.keys(`transaction:${transactionId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }
}