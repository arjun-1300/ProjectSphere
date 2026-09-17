import { createApp } from './app.js';
import { env } from './config/env.js';
import { disconnectPrisma } from './config/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `\n🚀 ProjectSphere API running\n` +
      `   → http://localhost:${env.PORT}${env.API_PREFIX}\n` +
      `   → env: ${env.NODE_ENV}\n`,
  );
});

/** Gracefully close HTTP server + DB connections on shutdown signals. */
async function shutdown(signal: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(async () => {
    await disconnectPrisma();
    // eslint-disable-next-line no-console
    console.log('Closed out remaining connections. Bye 👋');
    process.exit(0);
  });

  // Force-exit if graceful shutdown hangs.
  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.error('Forcing shutdown after timeout.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
