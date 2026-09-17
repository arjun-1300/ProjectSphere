import { PrismaClient } from '@prisma/client';
import { isProd } from './env.js';

/**
 * Prisma client singleton.
 *
 * In dev, hot-reload (tsx watch) can otherwise spawn many clients and exhaust
 * the connection pool, so we cache the instance on globalThis.
 *
 * We also emit `query` events so slow queries (> SLOW_QUERY_MS) are logged with
 * their duration — a cheap, always-on performance signal in any environment.
 */
const SLOW_QUERY_MS = 200;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'warn' },
      { emit: 'stdout', level: 'error' },
    ],
  });

  // Slow-query logging. Guarded so the type-only sandbox stub (no $on) is safe.
  if (typeof client.$on === 'function') {
    client.$on('query', (e: { duration: number; query: string }) => {
      if (e.duration >= SLOW_QUERY_MS) {
        // eslint-disable-next-line no-console
        console.warn(`🐌 Slow query (${e.duration}ms): ${e.query}`);
      }
    });
  }
  return client;
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (!isProd) {
  globalForPrisma.prisma = prisma;
}

/** Gracefully close the DB connection (called on shutdown). */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
