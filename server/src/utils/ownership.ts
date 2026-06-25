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

/**
 * Returns a Mongo filter that matches documents the user either owns OR is
 * assigned to. Admins are unrestricted. Used for tasks, where a manager can
 * assign work owned by them to another user who must still see/act on it.
 */
export function ownerOrAssigneeFilter(
  user: AuthUser | undefined,
  base: Record<string, any> = {}
): Record<string, any> {
  if (!user) return { ...base, ownerId: null };
  if (user.role === 'admin') return { ...base };
  return { ...base, $or: [{ ownerId: user.id }, { assigneeIds: user.id }] };
}

/**
 * Throws 404 unless the user owns the document or is one of its assignees
 * (admins always pass). Lets assignees view/update tasks assigned to them
 * without being able to probe ids they have no relationship to.
 */
export function assertOwnerOrAssignee(
  doc: { ownerId?: any; assigneeIds?: any[] } | null,
  user: AuthUser | undefined
): void {
  if (!doc) throw createHttpError(404, 'Not found');
  if (user && user.role === 'admin') return;
  if (!user) throw createHttpError(404, 'Not found');
  const ownerId = doc.ownerId?.toString?.() ?? String(doc.ownerId);
  if (ownerId === user.id) return;
  const isAssignee = (doc.assigneeIds ?? []).some(
    (a) => (a?._id?.toString?.() ?? a?.toString?.() ?? String(a)) === user.id
  );
  if (!isAssignee) throw createHttpError(404, 'Not found');
}
