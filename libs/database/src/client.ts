import { PrismaClient } from './generated/client';

// Create a global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create a singleton Prisma client instance
const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export { prisma };
export default prisma;