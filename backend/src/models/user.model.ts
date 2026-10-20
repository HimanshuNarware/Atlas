import { Role } from '../constants/roles.js';

export interface User {
  id: string;
  email: string;
  name: string;
  last_name: string;
  password_hash: string;
  role: Role;
  approve: boolean;
  delete: boolean;
  block: boolean;
  created_at: Date;
  updated_at: Date;
}

export type SanitizedUser = Omit<User, 'password_hash'>;

export function sanitizeUser(user: User): SanitizedUser {
  const { password_hash: _omitted, ...sanitized } = user;
  return sanitized;
}

export interface UserAuthPayload {
  id: string;
  email: string;
  role: Role;
}
