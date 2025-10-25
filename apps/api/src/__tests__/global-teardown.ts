import { PrismaClient } from '@prisma/client';
import { redis } from '@eu-real-estate/database';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Clean up database connections
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@localhost:5432/eu_real_estate_test',
        },
      },
    });

    await prisma.$disconnect();

    // Clean up Redis connections
    if (redis.status === 'ready') {
      await redis.quit();
    }

    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('❌ Test environment cleanup failed:', error);
  }
}