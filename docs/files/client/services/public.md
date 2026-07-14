# `client/src/services/public.ts`
**Purpose:** Public (no-auth) endpoint for the product directory. Uses raw `fetch` (not the authed axios `api`) so it works for signed-out visitors.
**Language / Size:** TS / 830 bytes

## Exports
Type: `PublicProduct` (`{ id, name, slug, description, icon, banner, category: 'plugin'|'block'|'theme'|'standalone', githubUrl, wpOrgSlug, publicChangelogEnabled, publicIssuesEnabled }`).
Function: `getPublicProducts`.

## Imports (note the shared axios/fetch client from api.ts)
- None. Deliberately uses raw `fetch` for no-auth access (file header comment states this).

## Functions
- **`getPublicProducts(): Promise<PublicProduct[]>`** — raw `fetch GET /api/public/products`. On `!res.ok` throws `Error('Failed to load products')`. Returns `data.products` (the response's `products` array).

## Error handling
Explicit `res.ok` check throwing `Error('Failed to load products')`.

## Relationships
- Consumed by the Explore page (route `/explore`, the public product directory).
- Backend target: `/api/public/products`.
