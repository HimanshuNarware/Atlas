import { env } from './config/env.js';
import { testConnection, closePool } from './config/database.js';
import { logger } from './utils/logger.js';
import { createApp } from './app.js';
import { userRouter } from './routes/user.router.js';
import { docReaderRouter } from './routes/doc-reader.router.js';

// Export routers from index file for consumers and test suites
export { userRouter, docReaderRouter };

async function bootstrap(): Promise<void> {
  const app = createApp();

  // Test database connection at startup
  const isDbConnected = await testConnection();
  if (!isDbConnected) {
    logger.warn('⚠️ Server starting without active PostgreSQL connection. Ensure Postgres is running to use user persistence.');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 DocReader Backend Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    logger.info(`📍 Base URL: http://localhost:${env.PORT}`);
    logger.info(`🔗 Routers mounted:`);
    logger.info(`   - User Router: http://localhost:${env.PORT}/userrouter (or /users)`);
    logger.info(`     -> POST   /login`);
    logger.info(`     -> POST   /create`);
    logger.info(`     -> PATCH  /:id/block`);
    logger.info(`     -> DELETE /:id`);
    logger.info(`     -> PATCH  /:id`);
    logger.info(`     -> PATCH  /:id/approve`);
    logger.info(`   - DocReader Router: http://localhost:${env.PORT}/docReaderRouter (or /doc-reader)`);
    logger.info(`     -> POST   /upload`);
    logger.info(`     -> POST   /ans`);
    logger.info(`     -> GET    /history`);
  });

  // Graceful shutdown handling (SIGTERM & SIGINT)
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await closePool();
      } catch (err) {
        logger.error('Error closing database pool', err);
      }
      process.exit(0);
    });

    // Force close if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal error during application startup', err);
  process.exit(1);
});
