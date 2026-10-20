import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a bcrypt hash.
 */
export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Generate a cryptographically secure hex string token.
 */
export function generateHexToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a SHA-256 hex digest for sensitive identifiers or checksums.
 */
export function hashHex(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
