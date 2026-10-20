import { z } from 'zod';
import { ROLES } from '../constants/roles.js';

export const createUserSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  name: z.string().trim().min(1, 'Name is required').max(100),
  last_name: z.string().trim().min(1, 'Last name is required').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(ROLES).default('user'),
  approve: z.boolean().default(false),
  delete: z.boolean().default(false),
  block: z.boolean().default(false),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const loginUserSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginUserInput = z.infer<typeof loginUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  last_name: z.string().trim().min(1).max(100).optional(),
  role: z.enum(ROLES).optional(),
  approve: z.boolean().optional(),
  block: z.boolean().optional(),
  delete: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const blockUserSchema = z.object({
  block: z.boolean({ required_error: 'Block status must be a boolean' }),
});

export type BlockUserInput = z.infer<typeof blockUserSchema>;

export const approveUserSchema = z.object({
  approve: z.boolean({ required_error: 'Approve status must be a boolean' }),
});

export type ApproveUserInput = z.infer<typeof approveUserSchema>;

export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID format, UUID required'),
});

export type UserIdParam = z.infer<typeof userIdParamSchema>;
