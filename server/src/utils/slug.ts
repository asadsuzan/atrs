import slugify from 'slugify';

/** Slugifies a product name into a URL-safe base slug. */
export function baseSlug(name: string): string {
  return slugify(name || '', { lower: true, strict: true });
}

/**
 * Returns a slug derived from `base` that is not present in `taken`.
 * If `base` collides, appends `-2`, `-3`, ... until a free slug is found.
 * Pure (no DB access) so it can be unit-tested; callers supply the set of
 * slugs already used within the same owner's namespace.
 */
export function disambiguateSlug(base: string, taken: Set<string>): string {
  const safeBase = base || 'product';
  if (!taken.has(safeBase)) return safeBase;
  let n = 2;
  while (taken.has(`${safeBase}-${n}`)) n++;
  return `${safeBase}-${n}`;
}
