# `client/src/services/github.ts`
**Purpose:** Manage the user's GitHub connection (PAT) and sync a product's GitHub Releases into its Versions.
**Language / Size:** TS / 1181 bytes

## Exports
Types: `GitHubStatus` (`{ connected, login, connectedAt }`), `ReleaseSyncResult` (`{ repo, total, created, updated, skipped }`).
Functions: `getGithubStatus`, `connectGithub`, `disconnectGithub`, `syncProductReleases`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api`.

## Functions
- **`getGithubStatus(): Promise<GitHubStatus>`** — `GET /api/github/status`.
- **`connectGithub(token: string): Promise<GitHubStatus>`** — `POST /api/github/connect`; body `{ token }` (Personal Access Token; connects or replaces).
- **`disconnectGithub(): Promise<GitHubStatus>`** — `DELETE /api/github/connect` (removes the stored token).
- **`syncProductReleases(productId: string): Promise<ReleaseSyncResult>`** — `POST /api/github/products/{productId}/sync-releases` (no body); pulls GitHub Releases into the product's Versions.

## Error handling
None explicit; axios rejections propagate.

## Relationships
- Consumed by the Settings page (GitHub connect/disconnect) and ProductDetails (release sync).
- Backend target: `/api/github/*`.
