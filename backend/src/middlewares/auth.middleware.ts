import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error.js';
import { UserAuthPayload } from '../models/user.model.js';
import { env } from '../config/env.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserAuthPayload;
    }
  }
}

/**
 * Middleware to authenticate any valid registered user via Bearer JWT token.
 */
export function authenticateToken(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header. Bearer token required.');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Bearer token is empty');
  }

  const payload = authService.verifyToken(token);
  req.user = payload;
  next();
}

/**
 * Middleware to check admin authorization.
 * Supports:
 * 1. Bearer JWT token where role === 'admin'
 * 2. Dedicated x-admin-token / x-admin-key matching ADMIN_SECRET_KEY
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  // Check optional direct admin secret key header
  const adminSecretHeader = req.headers['x-admin-token'] ?? req.headers['x-admin-key'];
  if (adminSecretHeader && adminSecretHeader === env.ADMIN_SECRET_KEY) {
    req.user = {
      id: 'admin-system',
      email: 'admin@system.local',
      role: 'admin',
    };
    return next();
  }

  // Otherwise check Bearer JWT token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Admin authorization token required');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Admin token is empty');
  }

  const payload = authService.verifyToken(token);
  if (payload.role !== 'admin') {
    throw new ForbiddenError('Access denied: Administrator privileges required');
  }

  req.user = payload;
  next();
}
