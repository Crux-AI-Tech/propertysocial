import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

export default async function globalSetup() {
  console.log('🔧 Setting up test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@localhost:5432/eu_real_estate_test';
  process.env.REDIS_URL = process.env.REDIS_URL_TEST || 'redis://localhost:6379/1';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

  try {
    // Reset test database
    console.log('📊 Resetting test database...');
    execSync('npx prisma db push --force-reset --schema=../../libs/database/prisma/schema.prisma', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
    });

    // Generate Prisma client
    console.log('🔄 Generating Prisma client...');
    execSync('npx prisma generate --schema=../../libs/database/prisma/schema.prisma', {
      stdio: 'inherit',
    });

    // Test database connection
    console.log('🔗 Testing database connection...');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    await prisma.$connect();
    await prisma.$disconnect();

    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Test environment setup failed:', error);
    process.exit(1);
  }
}