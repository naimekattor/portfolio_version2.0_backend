import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDB } from './database/prisma.js';
import { initSocket } from './socket/index.js';
import { authService } from './modules/auth/auth.service.js';

async function startServer() {
  const app = createApp();
  const server = http.createServer(app);

  // Handle server errors cleanly (e.g., port already in use)
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`⚠️ Port ${env.PORT} is already in use by a running backend process. Close the existing process or change PORT in .env.`);
    } else {
      logger.error('Server error:', err);
    }
  });

  initSocket(server);

  // Non-blocking database connection check
  try {
    await connectDB();
    authService.ensureSuperAdminExists().catch((err) => {
      logger.warn('Super admin check deferred until valid DATABASE_URL is configured in .env');
    });
  } catch (err: any) {
    logger.error(`Database connection deferred: ${err?.message || err}`);
  }

  server.listen(env.PORT, () => {
    logger.info(`🚀 Express Server running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`);
    logger.info(`📚 Swagger API Docs available at http://localhost:${env.PORT}/api-docs`);
  });
}

startServer().catch((err) => {
  logger.error('Unexpected error during server boot:', err);
});

