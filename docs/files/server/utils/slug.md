# `server/src/utils/slug.ts`
**Purpose:** Generate URL-safe product slugs and disambiguate collisions within an owner's namespace.
**Language / Size:** TypeScript / 758 bytes

## Exports
- `function baseSlug(name: string): string`
- `function disambiguateSlug(base: string, taken: Set<string>): string`

## Imports (Internal / External)
- External: `slugify` (npm package).

## Functions / Methods
### `baseSlug(name)`
`slugify(name || '', { lower: true, strict: true })` — lowercased, special characters stripped, spaces hyphenated. Returns `''` for empty input.

### `disambiguateSlug(base, taken)`
Returns a slug not present in the `taken` set. Uses `base || 'product'` as a fallback for empty base. If the base is free, returns it; otherwise appends `-2`, `-3`, … incrementing until an unused slug is found. Pure (no DB access) — callers pass the set of slugs already used in the same owner's namespace.

## Data structures / Types / Constants
None.

## Important algorithms
Linear collision probing appending an incrementing numeric suffix.

## Relationships
Depends on the `slugify` package. Used by product creation/update logic to assign unique per-owner slugs; the `taken` set is built from existing owner-scoped slugs. Tested by `slug.test.ts`.

## Edge cases & known limitations
- Empty base falls back to `product` (and `product-2`, … on collision).
- Numbering starts at `-2` (the un-suffixed base counts as "1").
- Uniqueness is only relative to the provided `taken` set; concurrency/uniqueness across requests must be enforced by the caller/DB.
