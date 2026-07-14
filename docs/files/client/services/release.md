# `client/src/services/release.ts`
**Purpose:** Product release/changelog payloads — an authenticated full payload (incl. WP.org/Markdown export formats) and a public (no-auth) hosted changelog.
**Language / Size:** TS / 1609 bytes

## Exports
Types: `ReleaseType` (`'feature'|'improvement'|'bug-fix'`), `ReleaseItem`, `ReleaseBlock`, `ReleaseProduct`, `ReleasePayload`.
Functions: `getProductRelease`, `getPublicChangelog`.

### `ReleasePayload`
`{ product: ReleaseProduct, releases: ReleaseBlock[], unreleased: ReleaseBlock | null, formats?: { readme, markdown } }`. `ReleaseBlock` groups items by `ReleaseType` with counts and totals.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api` for the authed call. `getPublicChangelog` uses raw `fetch` (no auth).

## Functions
- **`getProductRelease(id: string): Promise<ReleasePayload>`** — `GET /api/products/{id}/release` (axios, authed); full payload incl. export formats.
- **`getPublicChangelog(id: string): Promise<ReleasePayload>`** — raw `fetch GET /api/public/changelog/{id}` (no auth). On `!res.ok` throws `Error('Changelog not found')` with a `.status` property set to `res.status`. Returns `res.json()`.

## Error handling
Authed call: none explicit. Public call: explicit `res.ok` check throwing a status-bearing error.

## Relationships
- `getProductRelease` consumed by ProductDetails / ReadmeTools (export formats). `getPublicChangelog` consumed by the PublicChangelog page (route `/changelog/:id`).
- Backend targets: `/api/products/:id/release` (authed) and `/api/public/changelog/:id` (public).
