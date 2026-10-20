export const ROLES = ['admin', 'user'] as const;

export type Role = (typeof ROLES)[number];

export function isValidRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}
