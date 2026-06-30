import crypto from 'crypto';

/**
 * Symmetric encryption for secrets stored at rest (e.g. a user's GitHub PAT).
 *
 * We never want a raw access token sitting in the database in plaintext: a DB
 * dump (or the app's own /export) would leak credentials that can read private
 * and org-owned repos. Tokens are encrypted with AES-256-GCM, which also
 * authenticates the ciphertext so tampering is detected on decrypt.
 *
 * The key is derived (scrypt) from `GITHUB_TOKEN_SECRET`, falling back to
 * `JWT_SECRET` so existing deployments work without new config. Rotating that
 * secret invalidates stored tokens — users simply reconnect.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard nonce size
const KEY_SALT = 'atrs:secret-box:v1';

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.GITHUB_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('GITHUB_TOKEN_SECRET (or JWT_SECRET) must be set to store integration tokens');
  }
  cachedKey = crypto.scryptSync(secret, KEY_SALT, 32);
  return cachedKey;
}

/** Encrypts a UTF-8 string. Output: base64 of iv | authTag | ciphertext. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

/** Reverses {@link encryptSecret}. Throws if the payload is malformed or tampered. */
export function decryptSecret(payload: string): string {
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const enc = raw.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
