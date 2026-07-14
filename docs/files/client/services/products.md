# `client/src/services/products.ts`
**Purpose:** Products API — CRUD + bulk delete, WP.org stats/preview/import (including an SSE streaming import with cancel), server directory browser for the repo-path picker, and stale-product listing.
**Language / Size:** TS / 6895 bytes

## Exports
Types: `DirEntry`, `BrowseDirsResult`, `ImportProgress`, `ImportSummary`, `StreamHandlers` (local), `WpStats`, `StaleProduct`.
Functions: `browseDirs`, `getProducts`, `getProductById`, `getProductWpStats`, `getStaleProducts`, `createProduct`, `updateProduct`, `deleteProduct`, `bulkDeleteProducts`, `wpOrgPreview`, `wpOrgPreviewBySlug`, `importFromWpOrg`, `importFromWpOrgStream`, `cancelImportSession`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api, getToken }` from `./api`. Most functions use axios; `importFromWpOrgStream` uses raw `fetch` + `getToken()` for SSE.

## Functions
- **`browseDirs(path?: string): Promise<BrowseDirsResult>`** — `GET /api/products/browse-dirs`; query `{ path }` when provided. Lists server sub-directories for the repo-path folder picker.
- **`getProducts(params?: any): Promise<any>`** — `GET /api/products`; merges default `{ limit: 1000, ...params }`.
- **`getProductById(id: string): Promise<any>`** — `GET /api/products/{id}`.
- **`getProductWpStats(id: string): Promise<WpStats>`** — `GET /api/products/{id}/wp-stats` (live WP.org ecosystem stats: installs, rank, hive, patchstack, ...).
- **`getStaleProducts(): Promise<{ days: number; products: StaleProduct[] }>`** — `GET /api/products/stale` (dashboard alert: products not updated within the configured window).
- **`createProduct(product: any): Promise<any>`** — `POST /api/products`; body = product.
- **`updateProduct({ id, ...product }: any): Promise<any>`** — `PATCH /api/products/{id}`.
- **`deleteProduct(id: string): Promise<any>`** — `DELETE /api/products/{id}`.
- **`bulkDeleteProducts(ids: string[]): Promise<any>`** — `DELETE /api/products/bulk`; ids in body via `{ data: { ids } }`.
- **`wpOrgPreview(username: string): Promise<any>`** — `GET /api/products/wporg-preview`; query `{ username }`.
- **`wpOrgPreviewBySlug(slugs: string[]): Promise<any>`** — `GET /api/products/wporg-preview-by-slug`; query `{ slugs: slugs.join(',') }`.
- **`importFromWpOrg(username: string, slugs: string[]): Promise<any>`** — `POST /api/products/import-from-wporg`; body `{ username, slugs }`; per-call `timeout: 120000` (overrides the 30s default).
- **`importFromWpOrgStream(username, slugs, handlers: StreamHandlers, signal?): Promise<void>`** — raw `fetch POST /api/products/import-from-wporg` with `Content-Type: application/json` + `Authorization: Bearer <token>` when present; body `{ username, slugs }`; parses SSE (blank-line blocks, `event:`/`data:`) dispatching `session`/`progress`/`complete`/`error` to the handlers. Same server endpoint as `importFromWpOrg` but consumed as a stream.
- **`cancelImportSession(sessionId: string): Promise<void>`** — `POST /api/products/import-from-wporg/cancel` (axios); body `{ sessionId }`; server stops the loop, rolls back products created in the session, and streams the rollback over the still-open import stream.

## Error handling
`importFromWpOrgStream`: if `!res.ok || !res.body`, builds `Import request failed (<status>)`, tries to read a JSON error `message`, calls `handlers.onError(message)` and returns (no throw). Other functions: none explicit (axios propagates).

## Relationships
- Consumed by the Products and ProductDetails pages, the Dashboard (`getStaleProducts` → `StaleProductAlert`), and the WP.org import flow (`WpImportContext`/`WpImportProvider`, `WpOrgImportDialog`, `WpImportMiniPlayer`). `browseDirs` feeds the repo-path folder picker.
- Backend target: `/api/products/*`.
