import { PrismaClient } from '@prisma/client';
import { redis } from '@eu-real-estate/database';
import { CacheService } from '../services/cache.service';
import { ThirdPartyIntegrationService } from '../services/third-party-integration.service';

// Test database instance
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@localhost:5432/eu_real_estate_test',
    },
  },
});

// Mock third-party services for testing
jest.mock('../services/third-party-integration.service');

// Setup test environment
beforeAll(async () => {
  // Clear test database
  await cleanDatabase();
  
  // Initialize test data
  await seedTestData();
  
  // Clear cache
  await CacheService.clear();
});

afterAll(async () => {
  // Clean up after all tests
  await cleanDatabase();
  await testPrisma.$disconnect();
  await redis.quit();
});

beforeEach(async () => {
  // Clear cache before each test
  await CacheService.clear();
});

afterEach(async () => {
  // Clean up after each test
  jest.clearAllMocks();
});

/**
 * Clean test database
 */
export async function cleanDatabase(): Promise<void> {
  const tablenames = await testPrisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.log({ error });
  }
}

/**
 * Seed test data
 */
export async function seedTestData(): Promise<void> {
  // Create test users
  await testPrisma.user.createMany({
    data: [
      {
        id: 'test-user-1',
        email: 'buyer@test.com',
        password: '$2b$10$hashedpassword',
        firstName: 'John',
        lastName: 'Buyer',
        role: 'BUYER',
        status: 'ACTIVE',
        country: 'DE',
        language: 'en',
        emailVerified: true,
      },
      {
        id: 'test-user-2',
        email: 'agent@test.com',
        password: '$2b$10$hashedpassword',
        firstName: 'Jane',
        lastName: 'Agent',
        role: 'AGENT',
        status: 'ACTIVE',
        country: 'DE',
        language: 'en',
        emailVerified: true,
      },
      {
        id: 'test-user-3',
        email: 'admin@test.com',
        password: '$2b$10$hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        status: 'ACTIVE',
        country: 'DE',
        language: 'en',
        emailVerified: true,
      },
    ],
  });

  // Create test properties
  await testPrisma.property.createMany({
    data: [
      {
        id: 'test-property-1',
        title: 'Beautiful Apartment in Berlin',
        description: 'A stunning 2-bedroom apartment in the heart of Berlin',
        propertyType: 'APARTMENT',
        status: 'ACTIVE',
        price: 450000,
        currency: 'EUR',
        size: 85,
        bedrooms: 2,
        bathrooms: 1,
        address: 'Unter den Linden 1',
        city: 'Berlin',
        country: 'DE',
        postalCode: '10117',
        latitude: 52.5162746,
        longitude: 13.3777041,
        agentId: 'test-user-2',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
      {
        id: 'test-property-2',
        title: 'Modern House in Munich',
        description: 'A modern 3-bedroom house with garden',
        propertyType: 'HOUSE',
        status: 'ACTIVE',
        price: 750000,
        currency: 'EUR',
        size: 120,
        bedrooms: 3,
        bathrooms: 2,
        address: 'Marienplatz 8',
        city: 'Munich',
        country: 'DE',
        postalCode: '80331',
        latitude: 48.1374,
        longitude: 11.5755,
        agentId: 'test-user-2',
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-02'),
      },
    ],
  });

  // Create test property tags
  await testPrisma.propertyTag.createMany({
    data: [
      {
        id: 'test-tag-1',
        name: 'Luxury',
        color: '#FFD700',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'test-tag-2',
        name: 'New Construction',
        color: '#32CD32',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });

  // Create test transactions
  await testPrisma.transaction.createMany({
    data: [
      {
        id: 'test-transaction-1',
        propertyId: 'test-property-1',
        buyerId: 'test-user-1',
        agentId: 'test-user-2',
        status: 'PENDING',
        offerAmount: 440000,
        currency: 'EUR',
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-15'),
      },
    ],
  });
}

/**
 * Create test JWT token
 */
export function createTestToken(userId: string, role: string = 'BUYER'): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

/**
 * Mock third-party service responses
 */
export const mockThirdPartyResponses = {
  propertyValuation: [
    {
      propertyId: 'epd_12345',
      estimatedValue: 450000,
      currency: 'EUR',
      confidence: 0.85,
      lastUpdated: new Date(),
      source: 'European Property Data',
      comparables: [
        {
          address: '125 Main Street, Berlin',
          price: 440000,
          size: 80,
          distance: 50,
        },
      ],
    },
  ],
  mortgageQuotes: [
    {
      lenderId: 'lender_123',
      lenderName: 'Deutsche Bank',
      interestRate: 2.5,
      monthlyPayment: 1650,
      totalAmount: 360000,
      term: 25,
      currency: 'EUR',
      conditions: ['Stable employment required'],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  ],
  legalServices: [
    {
      providerId: 'legal_456',
      providerName: 'Berlin Legal Services',
      serviceType: 'conveyancing',
      estimatedCost: 2500,
      currency: 'EUR',
      estimatedDuration: 30,
      languages: ['en', 'de'],
      jurisdictions: ['DE'],
      rating: 4.8,
      contact: {
        email: 'info@berlinlegal.de',
        phone: '+49301234567',
        address: 'Unter den Linden 1, Berlin',
      },
    },
  ],
  paymentMethods: [
    {
      id: 'stripe_sepa',
      name: 'SEPA Direct Debit',
      type: 'bank_transfer',
      countries: ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT'],
      currencies: ['EUR'],
      processingFee: 0.8,
      processingTime: '3-5 business days',
      enabled: true,
    },
  ],
  geocoding: {
    lat: 52.5162746,
    lng: 13.3777041,
    formattedAddress: 'Brandenburg Gate, Pariser Platz, 10117 Berlin, Germany',
    components: [],
  },
};

/**
 * Setup mock implementations
 */
export function setupMocks(): void {
  const mockIntegrationService = ThirdPartyIntegrationService as jest.Mocked<typeof ThirdPartyIntegrationService>;
  
  mockIntegrationService.getPropertyValuation.mockResolvedValue(mockThirdPartyResponses.propertyValuation);
  mockIntegrationService.getMortgageQuotes.mockResolvedValue(mockThirdPartyResponses.mortgageQuotes);
  mockIntegrationService.getLegalServices.mockResolvedValue(mockThirdPartyResponses.legalServices);
  mockIntegrationService.getPaymentMethods.mockResolvedValue(mockThirdPartyResponses.paymentMethods);
  mockIntegrationService.geocodeAddress.mockResolvedValue(mockThirdPartyResponses.geocoding);
  mockIntegrationService.sendEmail.mockResolvedValue(true);
  mockIntegrationService.sendSMS.mockResolvedValue(true);
}

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidDate(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
  
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },
});