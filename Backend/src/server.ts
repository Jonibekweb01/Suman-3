import type { Server } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './core/logger';
import { connectDatabase, disconnectDatabase } from './core/prisma';
import { purgeExpiredTokens } from './modules/auth/auth.service';

const SHUTDOWN_TIMEOUT_MS = 10_000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, prefix: env.API_PREFIX },
      `Suman API listening on http://localhost:${env.PORT}${env.API_PREFIX}`,
    );
  });

  // Expired refresh tokens and OTP rows accumulate forever otherwise. An
  // interval is enough at this scale; move it to a real scheduler when the
  // API runs on more than one instance.
  const cleanupTimer = setInterval(() => {
    purgeExpiredTokens()
      .then(({ tokens, codes }) => {
        if (tokens > 0 || codes > 0) logger.info({ tokens, codes }, 'Purged expired auth records');
      })
      .catch((error: unknown) => logger.error({ err: error }, 'Cleanup job failed'));
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();

  let shuttingDown = false;

  /**
   * Graceful shutdown: stop accepting connections, let in-flight requests
   * finish, then close the database. The timeout is the escape hatch for a
   * hung keep-alive socket.
   */
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    clearInterval(cleanupTimer);

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close((error) => {
      if (error) logger.error({ err: error }, 'Error while closing the HTTP server');
      disconnectDatabase()
        .catch((dbError: unknown) => logger.error({ err: dbError }, 'Error disconnecting database'))
        .finally(() => process.exit(error ? 1 : 0));
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // An unhandled rejection leaves the process in an unknown state; log it and
  // let the orchestrator restart a clean one.
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start the server');
  process.exit(1);
});
