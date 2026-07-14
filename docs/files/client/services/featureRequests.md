# `client/src/services/featureRequests.ts`
**Purpose:** CRUD for user-submitted feature requests (with admin status/response fields).
**Language / Size:** TS / 1310 bytes

## Exports
Types: `FeatureRequestStatus` (`'pending'|'planned'|'in-progress'|'done'|'declined'`), `FeatureRequest`.
Functions: `getFeatureRequests`, `createFeatureRequest`, `updateFeatureRequest`, `deleteFeatureRequest`.

### `FeatureRequest`
`{ _id, requesterId (string | {_id,name,email}), title, description?, status, adminNote?, createdAt, updatedAt }`. `requesterId` is populated for admins, a plain id string otherwise.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api`.

## Functions
- **`getFeatureRequests(): Promise<FeatureRequest[]>`** — `GET /api/feature-requests` (own requests for users; all for admins).
- **`createFeatureRequest(request: { title; description? }): Promise<any>`** — `POST /api/feature-requests`; body = request.
- **`updateFeatureRequest({ id, ...request }): Promise<any>`** — `PATCH /api/feature-requests/{id}`; body = partial `{ title?, description?, status?, adminNote? }`.
- **`deleteFeatureRequest(id: string): Promise<any>`** — `DELETE /api/feature-requests/{id}`.

## Error handling
None explicit; axios rejections propagate.

## Relationships
- Consumed by the FeatureRequests page (route `/feature-requests`).
- Backend target: `/api/feature-requests`.
