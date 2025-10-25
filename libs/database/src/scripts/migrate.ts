import { execSync } from 'child_process';
import path from 'path';

/**
 * Run Prisma migrations
 */
export async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Get the path to the Prisma schema
    const prismaSchemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
    
    // Run Prisma migrate
    execSync(`npx prisma migrate deploy --schema=${prismaSchemaPath}`, { 
      stdio: 'inherit',
      env: {
        ...process.env,
      }
    });
    
    console.log('✅ Database migrations completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error running database migrations:', error);
    return false;
  }
}

/**
 * Create a new migration
 */
export async function createMigration(name: string) {
  try {
    console.log(`🔄 Creating migration: ${name}...`);
    
    // Get the path to the Prisma schema
    const prismaSchemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
    
    // Run Prisma migrate dev to create a new migration
    execSync(`npx prisma migrate dev --name=${name} --schema=${prismaSchemaPath}`, { 
      stdio: 'inherit',
      env: {
        ...process.env,
      }
    });
    
    console.log('✅ Migration created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating migration:', error);
    return false;
  }
}

/**
 * Reset the database (for development only)
 */
export async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...');
    
    // Get the path to the Prisma schema
    const prismaSchemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
    
    // Run Prisma migrate reset
    execSync(`npx prisma migrate reset --force --schema=${prismaSchemaPath}`, { 
      stdio: 'inherit',
      env: {
        ...process.env,
      }
    });
    
    console.log('✅ Database reset successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    return false;
  }
}

// Run migrations if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'deploy':
      runMigrations()
        .then(() => console.log('Migration deployment completed'))
        .catch(e => {
          console.error(e);
          process.exit(1);
        });
      break;
    case 'create':
      const migrationName = args[1];
      if (!migrationName) {
        console.error('Migration name is required');
        process.exit(1);
      }
      createMigration(migrationName)
        .then(() => console.log('Migration creation completed'))
        .catch(e => {
          console.error(e);
          process.exit(1);
        });
      break;
    case 'reset':
      resetDatabase()
        .then(() => console.log('Database reset completed'))
        .catch(e => {
          console.error(e);
          process.exit(1);
        });
      break;
    default:
      console.error('Unknown command. Use "deploy", "create", or "reset"');
      process.exit(1);
  }
}