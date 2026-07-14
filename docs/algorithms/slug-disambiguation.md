# Slug Generation & Disambiguation

**Source:** `server/src/utils/slug.ts` — `baseSlug`, `disambiguateSlug`; caller `ProductService.uniqueSlugForOwner` + `createProduct`.

## Purpose
Produce a URL-safe product slug that is unique within a single owner's namespace, tolerating collisions deterministically.

## Inputs / Outputs
- `baseSlug(name: string): string` — the normalized base.
- `disambiguateSlug(base: string, taken: Set<string>): string` — a slug guaranteed not in `taken`.

## Algorithm
1. **Normalize (`baseSlug`).** `slugify(name || '', { lower: true, strict: true })` — lowercased, special characters stripped, spaces hyphenated. Empty input → `''`.
2. **Collision probe (`disambiguateSlug`).**
   - Use `base || 'product'` as the fallback for an empty base.
   - If the base is free (not in `taken`), return it.
   - Otherwise append `-2`, `-3`, … incrementing until an unused slug is found (the un-suffixed base counts as "1", so numbering starts at `-2`).
   - Pure function — no DB access; the caller supplies `taken`.

## Caller integration (uniqueness within an owner)
`uniqueSlugForOwner(name, ownerId, excludeId?)`:
1. `base = baseSlug(name)`.
2. Query owner-scoped slugs matching `^base(-\d+)?$` (excluding `excludeId` on update) and `.distinct('slug')` → build the `taken` Set.
3. Return `disambiguateSlug(base, taken)`.

Because this is read-then-write, `createProduct` retries up to 4 times on Mongo error `11000` (the `{ ownerId, slug }` unique index), recomputing the slug each time; after 4 failures it throws 409.

## Complexity / performance
- `disambiguateSlug` is O(k) Set lookups where k is the number of existing same-base slugs (linear probing). One scoped DB read per slug computation on the caller side.

## Edge cases & limitations
- Empty base falls back to `product` (then `product-2`, …).
- Uniqueness is only relative to the provided `taken` set; true cross-request uniqueness is enforced by the DB unique index + retry.
- Numbering is not gap-filling in a strict sense beyond the first free suffix — it returns the first unused value scanning upward.
