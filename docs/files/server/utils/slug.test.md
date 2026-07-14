# `server/src/utils/slug.test.ts`
**Purpose:** Vitest unit tests for `baseSlug` and `disambiguateSlug` from `slug.ts`.
**Language / Size:** TypeScript / 1448 bytes

## Exports
None (test file).

## Imports (Internal / External)
- Internal: `baseSlug`, `disambiguateSlug` from `./slug`.
- External: `describe`, `it`, `expect` from `vitest`.

## Functions / Methods
Suite `baseSlug`:
- **lowercases and hyphenates** — `My Cool Plugin` → `my-cool-plugin`.
- **strips special characters** — `Foo & Bar! (Pro)` → `foo-and-bar-pro` (note `&` becomes `and` via slugify).
- **handles empty input** — `''` → `''`.

Suite `disambiguateSlug`:
- **returns the base when free** — `my-plugin` with empty set → `my-plugin`.
- **appends -2 on first collision** — set `{my-plugin}` → `my-plugin-2`.
- **skips taken numbered slugs** — set `{my-plugin, my-plugin-2, my-plugin-3}` → `my-plugin-4`.
- **falls back to "product" for empty base** — `''` with empty set → `product`; with `{product}` → `product-2`.
- **does not collide across different owners** — an independent (empty) owner-B set yields `my-plugin` even though owner A has it (documents the owner-scoped-set contract).

## Data structures / Types / Constants
None.

## Important algorithms
Validates slugify normalization and the incrementing-suffix disambiguation, including the empty-base fallback and owner-scoping contract.

## Relationships
Tests `slug.ts`.

## Edge cases & known limitations
Covers the documented behaviors; relies on the `slugify` package's own transliteration rules (e.g. `&` → `and`).
