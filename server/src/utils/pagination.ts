/**
 * Parses a `limit` query param. `-1` is preserved as the sanctioned "return
 * all" sentinel (used by owner-scoped list views); any other value is coerced
 * to a positive integer and clamped to [1, max] so a caller can't request an
 * absurd page size. Non-numeric / missing input falls back to `def`.
 */
export function parseLimit(raw: unknown, def = 10, max = 1000): number {
  const n = parseInt(String(raw), 10);
  if (n === -1) return -1;
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(n, max);
}

/** Parses a `page` query param, clamped to a sane positive range. */
export function parsePage(raw: unknown, def = 1, max = 100_000): number {
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(n, max);
}
