# `client/src/services/versions.ts`
**Purpose:** CRUD for product Versions, plus a cross-product listing.
**Language / Size:** TS / 802 bytes

## Exports (functions)
`getVersions`, `getAllVersions`, `createVersion`, `updateVersion`, `deleteVersion`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api`.

## Functions
- **`getVersions(productId: string): Promise<any>`** — `GET /api/versions`; query `{ productId }`.
- **`getAllVersions(): Promise<any>`** — `GET /api/versions` (no params; all versions across the owner's products, product populated).
- **`createVersion(version: any): Promise<any>`** — `POST /api/versions`; body = version.
- **`updateVersion({ id, ...version }: any): Promise<any>`** — `PATCH /api/versions/{id}`.
- **`deleteVersion(id: string): Promise<any>`** — `DELETE /api/versions/{id}`.

## Error handling
None explicit; axios rejections propagate.

## Relationships
- Consumed by ProductDetails (versions tab) and any cross-product version views.
- Backend target: `/api/versions`.
