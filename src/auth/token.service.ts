import { createHash, randomBytes } from 'crypto';

/**
 * Opaque, single-use tokens (email verification, password reset, refresh tokens)
 * are generated as random bytes and only the SHA-256 hash is persisted —
 * the raw token is never recoverable from the database.
 */
export function generateOpaqueToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  const hash = hashOpaqueToken(raw);
  return { raw, hash };
}

export function hashOpaqueToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
