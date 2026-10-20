import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';
import multer from 'multer';

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Cannot ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn(`Operational error: ${err.message}`, {
      code: err.code,
      statusCode: err.statusCode,
      details: err.details,
    });
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  if (err instanceof multer.MulterError) {
    logger.warn(`Multer upload error: ${err.message}`, { code: err.code });
    sendError(res, `Upload error: ${err.message}`, 400, 'UPLOAD_ERROR');
    return;
  }

  // PostgreSQL duplicate key error
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
    logger.warn('PostgreSQL duplicate key error', err);
    sendError(res, 'A record with this unique value already exists', 409, 'DUPLICATE_ENTRY');
    return;
  }

  // SyntaxError from malformed JSON in request body
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    logger.warn('Malformed JSON payload received');
    sendError(res, 'Malformed JSON payload', 400, 'INVALID_JSON');
    return;
  }

  logger.error('Unhandled internal server error', err);
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : (err instanceof Error ? err.message : 'Unknown error');
  sendError(res, message, 500, 'INTERNAL_SERVER_ERROR');
}
