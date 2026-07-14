# `client/src/services/activities.ts`
**Purpose:** CRUD + bulk operations + reorder for Activity records.
**Language / Size:** TS / 1306 bytes

## Exports (functions)
`getActivities`, `getActivityById`, `createActivity`, `updateActivity`, `deleteActivity`, `bulkUpdateActivities`, `bulkDeleteActivities`, `reorderActivity`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api` (the shared axios instance; carries baseURL `/api` and the JWT interceptor).

## Functions
- **`getActivities(params?: any): Promise<any>`** — `GET /api/activities`; query params passed through `{ params }`; returns `data`.
- **`getActivityById(id: string): Promise<any>`** — `GET /api/activities/{id}`; returns `data`.
- **`createActivity(activity: any): Promise<any>`** — `POST /api/activities`; body = the activity object; returns `data`.
- **`updateActivity({ id, ...activity }: any): Promise<any>`** — `PATCH /api/activities/{id}`; body = remaining fields (id stripped); returns `data`.
- **`deleteActivity(id: string): Promise<any>`** — `DELETE /api/activities/{id}`; returns `data`.
- **`bulkUpdateActivities(ids: string[], update: any): Promise<any>`** — `POST /api/activities/bulk-update`; body `{ ids, update }`. Comment notes POST (not PATCH) is used so the request is not swallowed by the `/:id` route.
- **`bulkDeleteActivities(ids: string[]): Promise<any>`** — `DELETE /api/activities/bulk-delete`; ids sent in request body via axios `{ data: { ids } }`.
- **`reorderActivity(id: string, displayOrder: number): Promise<any>`** — `PATCH /api/activities/{id}/reorder`; body `{ displayOrder }`.

## Error handling
No explicit try/catch; axios rejections propagate (global 401 handling via api.ts interceptor).

## Relationships
- Consumed by the Activities page/feed and activity forms/dialogs (route `/activities`).
- Backend target: `/api/activities` router.
