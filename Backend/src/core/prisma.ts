import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * A single PrismaClient per process. In dev, `tsx watch` reloads the module
 * graph on every save — caching the client on `globalThis` stops the connection
 * pool from being exhausted by orphaned clients.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ]
      : [{ emit: 'stdout', level: 'error' }],
  });

if (env.isDevelopment) {
  globalForPrisma.prisma = prisma;

  prisma.$on('query' as never, (event: { query: string; duration: number }) => {
    // Only surface slow queries — a full query log drowns the dev console.
    if (event.duration >= 100) {
      logger.debug({ duration: event.duration, query: event.query }, 'slow query');
    }
  });
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
