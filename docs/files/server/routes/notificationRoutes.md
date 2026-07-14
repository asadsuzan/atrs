# `server/src/routes/notificationRoutes.ts`
**Purpose:** Express router for user notifications (CRUD + real-time SSE stream) plus a few authenticated app-config read endpoints (nav settings, branding, sounds); mounted at `/api/notifications` (app.ts: `app.use('/api/notifications', notificationRoutes)` — mounted **without** guards, so each route applies its own).
**Language / Size:** TypeScript / 3868 bytes
## Middleware applied (router-level)
- None global to the router; guards are applied per-route (`requireAuth` + `requireActive` on standard routes; `requireAuthSSE` + `requireActive` on the SSE subscribe route).
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| GET | `/` | requireAuth, requireActive | — | `NotificationController.getMyNotifications` |
| PATCH | `/read-all` | requireAuth, requireActive | — | `NotificationController.markAllAsRead` |
| PATCH | `/:id/read` | requireAuth, requireActive | — | `NotificationController.markAsRead` |
| DELETE | `/:id` | requireAuth, requireActive | — | `NotificationController.deleteNotification` |
| GET | `/subscribe` | requireAuthSSE, requireActive | — | inline SSE handler → `notificationManager.addClient` |
| GET | `/nav-settings` | requireAuth, requireActive | — | inline handler → `readAppConfig()` |
| GET | `/branding` | requireAuth, requireActive | — | inline handler → `readAppConfig()` |
| GET | `/sounds` | requireAuth, requireActive | — | inline handler → `readAppConfig()` |
## Relationships
- Controller: `../controllers/NotificationController` (`getMyNotifications`, `markAsRead`, `markAllAsRead`, `deleteNotification`).
- Services/utils: `../services/NotificationManager` (`notificationManager`), `../utils/appConfig` (`readAppConfig`).
- Middleware: `../middlewares/auth` (`requireAuth`, `requireActive`, `requireAuthSSE`).
## Notes
- `/read-all` is declared before `/:id/read` so it isn't captured as an id.
- `GET /subscribe` is an SSE endpoint using `requireAuthSSE` (accepts JWT via `Authorization` header **or** `?token=<jwt>` query param, since EventSource can't set headers). Sets `text/event-stream` headers, flushes `: ok`, enables socket keep-alive with no timeout, registers the client with `notificationManager.addClient(user.id, user.isRoot, res, user.role === 'admin')`, and unsubscribes on `req.on('close')`.
- The three config-read endpoints (`/nav-settings`, `/branding`, `/sounds`) are defined inline, read from `readAppConfig()`, and are defensively wrapped to return sensible defaults (`200`) on any error rather than failing — they expose admin-configured settings to all users.
