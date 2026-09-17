import crypto from 'node:crypto';

/**
 * Refresh tokens and email/reset tokens are opaque random strings. We store
 * only their SHA-256 hash in the DB — so a database leak never exposes usable
 * tokens (same principle as storing password hashes, not passwords).
 */

/** Generate a cryptographically strong random token (URL-safe). */
export function generateRawToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Hash a raw token for storage / lookup. Deterministic (no per-call salt). */
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Generate a numeric 6-digit code (used for email verification codes). */
export function generateNumericCode(digits = 6): string {
  const max = 10 ** digits;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(digits, '0');
}
