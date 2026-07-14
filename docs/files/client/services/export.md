# `client/src/services/export.ts`
**Purpose:** Download a full database export as a JSON file (admin only), triggering a browser download.
**Language / Size:** TS / 513 bytes

## Exports (functions)
`exportAllData`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api`.

## Functions
- **`exportAllData(): Promise<void>`** — `GET /api/export` with `responseType: 'blob'`. Wraps the blob in an object URL, creates a hidden `<a download="atrs-export.json">`, appends it to `document.body`, clicks it to trigger download, removes it, then revokes the object URL. Uses the authenticated axios client so the JWT is attached.

## Error handling
None explicit; axios rejections propagate.

## Relationships
- Consumed by the Settings page (admin data-export action).
- Backend target: `/api/export`.
