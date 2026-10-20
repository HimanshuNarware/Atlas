import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { globalLimiter } from './middlewares/rate-limiter.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { userRouter } from './routes/user.router.js';
import { docReaderRouter } from './routes/doc-reader.router.js';
import { sendSuccess } from './utils/response.js';
import { env } from './config/env.js';

export function createApp(): Express {
  const app = express();

  // Security headers & CORS
  app.use(helmet());
  
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!requestOrigin) return callback(null, true);
        if (allowedOrigins.includes(requestOrigin) || env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(new Error(`CORS policy blocked access from origin: ${requestOrigin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token', 'x-admin-key'],
    })
  );

  // Rate Limiting
  app.use(globalLimiter);

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Health check endpoint (Node.js best practice #13)
  app.get('/health', (_req, res) => {
    sendSuccess(res, { status: 'healthy', uptime: process.uptime() }, 'DocReader API is healthy');
  });

  // Mount routers - supporting both canonical paths and explicitly requested names
  // userRouter: create, login, block, delete, update
  app.use('/userrouter', userRouter);
  app.use('/users', userRouter);

  // docReaderRouter: upload, ans, history
  app.use('/docReaderRouter', docReaderRouter);
  app.use('/doc-reader', docReaderRouter);

  // Central API v1 prefix support
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/doc-reader', docReaderRouter);

  // 404 Handler
  app.use(notFoundHandler);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
