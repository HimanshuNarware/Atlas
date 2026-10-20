import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/app-error.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Request body validation failed', error.flatten().fieldErrors));
      } else {
        next(error);
      }
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as unknown as Record<string, string>;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('URL parameter validation failed', error.flatten().fieldErrors));
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as unknown as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Query parameter validation failed', error.flatten().fieldErrors));
      } else {
        next(error);
      }
    }
  };
}
