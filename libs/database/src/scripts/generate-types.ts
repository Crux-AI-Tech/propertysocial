import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Generate TypeScript types from Prisma schema
 */
export async function generateTypes() {
  try {
    console.log('🔄 Generating TypeScript types from Prisma schema...');
    
    // Get the path to the Prisma schema
    const prismaSchemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
    
    // Run Prisma generate
    execSync(`npx prisma generate --schema=${prismaSchemaPath}`, { 
      stdio: 'inherit',
      env: {
        ...process.env,
      }
    });
    
    console.log('✅ TypeScript types generated successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error generating TypeScript types:', error);
    return false;
  }
}

/**
 * Create index file for generated client
 */
export async function createClientIndex() {
  try {
    console.log('🔄 Creating index file for generated client...');
    
    const clientPath = path.resolve(__dirname, '../../src/generated/client');
    const indexPath = path.join(clientPath, 'index.ts');
    
    // Check if directory exists
    if (!fs.existsSync(clientPath)) {
      fs.mkdirSync(clientPath, { recursive: true });
    }
    
    // Create index file
    const content = `export * from '@prisma/client';\n`;
    fs.writeFileSync(indexPath, content);
    
    console.log('✅ Client index file created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating client index file:', error);
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  Promise.all([generateTypes(), createClientIndex()])
    .then(() => console.log('Type generation completed'))
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}