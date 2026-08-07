import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

const connectionString = env.DATABASE_URL;

const pool = new pg.Pool({ connectionString });

// Prevent unhandled pg pool error events from crashing Node process
pool.on('error', (err) => {
  logger.error('PostgreSQL Pool background connection error:', err.message);
});

const adapter = new PrismaPg(pool);

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export async function connectDB() {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL Database via Prisma Pg Adapter');
  } catch (error: any) {
    logger.error(`Database connection failed: ${error?.message || error}. Proceeding server startup...`);
  }
}
