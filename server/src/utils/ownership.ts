import createHttpError from './httpError';
import type { AuthUser } from '../types/auth';

/**
 * Returns a Mongo filter scoped to the user's own records.
 * Admins are unrestricted (empty scope), so they see everything.
 */
export function scopeFilter(user: AuthUser | undefined, base: Record<string, any> = {}): Record<string, any> {
  if (!user) {
    // No authenticated user => match nothing (defensive; routes should require auth).
    return { ...base, ownerId: null };
  }
  if (user.role === 'admin') {
    return { ...base };
  }
  return { ...base, ownerId: user.id };
}

/**
 * Throws 404 if a non-admin user does not own the given document.
 * Uses 404 (not 403) so users cannot probe which ids exist.
 */
export function assertOwner(doc: { ownerId?: any } | null, user: AuthUser | undefined): void {
  if (!doc) throw createHttpError(404, 'Not found');
  if (user && user.role === 'admin') return;
  const ownerId = doc.ownerId?.toString?.() ?? String(doc.ownerId);
  if (!user || ownerId !== user.id) {
    throw createHttpError(404, 'Not found');
  }
}
