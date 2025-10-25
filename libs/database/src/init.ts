import { prisma } from './client';
import { redis } from './redis';
import { seed } from './seed';

/**
 * Initialize database connections and perform setup tasks
 */
export async function initDatabase(options: {
  seedIfEmpty?: boolean;
  connectRedis?: boolean;
} = {}) {
  const { seedIfEmpty = false, connectRedis = true } = options;
  
  try {
    console.log('🔄 Initializing database connections...');
    
    // Connect to Redis if needed
    if (connectRedis) {
      await redis.connect();
    }
    
    // Check if database needs seeding
    if (seedIfEmpty) {
      const userCount = await prisma.user.count();
      
      if (userCount === 0) {
        console.log('Database is empty, running seed...');
        await seed();
      } else {
        console.log('Database already contains data, skipping seed');
      }
    }
    
    console.log('✅ Database initialization completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

/**
 * Gracefully shut down database connections
 */
export async function shutdownDatabase() {
  try {
    console.log('🔄 Shutting down database connections...');
    
    // Disconnect Redis
    await redis.disconnect();
    
    // Disconnect Prisma
    await prisma.$disconnect();
    
    console.log('✅ Database connections closed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error shutting down database connections:', error);
    return false;
  }
}

// Run initialization if executed directly
if (require.main === module) {
  initDatabase({ seedIfEmpty: true })
    .then(() => console.log('Database initialization completed'))
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}