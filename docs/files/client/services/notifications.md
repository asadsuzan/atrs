# `client/src/services/notifications.ts`
**Purpose:** In-app notifications — list, mark read (single/all), delete.
**Language / Size:** TS / 545 bytes

## Exports (functions)
`getMyNotifications`, `markAsRead`, `markAllAsRead`, `deleteNotification`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api`.

## Functions
- **`getMyNotifications(): Promise<any>`** — `GET /api/notifications`.
- **`markAsRead(id: string): Promise<any>`** — `PATCH /api/notifications/{id}/read` (no body).
- **`markAllAsRead(): Promise<any>`** — `PATCH /api/notifications/read-all` (no body).
- **`deleteNotification(id: string): Promise<any>`** — `DELETE /api/notifications/{id}`.

## Error handling
None explicit; axios rejections propagate.

## Relationships
- Consumed by `NotificationContext`/`NotificationProvider` and `NotificationBell`.
- Backend target: `/api/notifications/*`.
