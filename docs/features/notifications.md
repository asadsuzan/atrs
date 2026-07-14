# Notifications

**Summary:** An in-app notification bell backed by a hybrid model — a live Server-Sent-Events (SSE) stream from a process-local `NotificationManager` plus a 60s-polled list of persisted per-user `Notification` records — with mark-read / mark-all / delete and per-user scoping.

## User-facing entry points

- **Notification bell** (`NotificationBell`) in the app header/global chrome: an unread-count badge and a popover listing notifications with per-row mark-read, "Mark all read", and "Clear all".
- No dedicated route — the bell is ambient chrome rendered inside the authenticated app shell.

## Client pieces

- Component: `client/src/components/layout/NotificationBell.tsx` — bell + popover; icon per notification `type`/message heuristic; relative timestamps via `date-fns`.
- Context/provider: `client/src/contexts/NotificationContext.tsx` (`NotificationProvider`, `useNotifications()`) — owns all notification state.
- Service: `client/src/services/notifications.ts` — `getMyNotifications`, `markAsRead`, `markAllAsRead`, `deleteNotification` (authed axios).
- React Query key: `['notifications']` → `getMyNotifications`, `enabled: !!user`, `refetchInterval: 60_000` while signed in. Mark mutations optimistically update realtime items then invalidate `['notifications']`.
- **Two state sources merged:** `dbNotifications` (persisted, from the query) + `realtimeNotifications` (in-memory, prepended per SSE event). `notifications` is a `useMemo` of realtime-first, then DB items not already present by `_id`, sorted `createdAt` desc. `clearNotifications()` empties only the realtime list (does not touch the DB).
- **SSE subscription** (main effect keyed on `userId`): reads sound config via `GET /api/notifications/sounds` → `setCachedSoundConfig`, then opens `new EventSource('/api/notifications/subscribe?token=<jwt>')` (token in query because EventSource cannot set headers). Listeners: `handshake` (resets error burst), `user-activity` (root-admin; sound + `toast.info`), `access-change` (sound + `toast.success` + `refreshMe()` so role/permission changes apply without reload), `password-reset-request` (admins; `toast.warning`), `notification` (general; merges + invalidates `['notifications']` + toast). `onerror` counts an error burst within 5s; after `>= 6` it closes and falls back to the 60s poll; otherwise lets EventSource auto-reconnect. A `refreshMeRef` keeps the latest `refreshMe` out of the effect deps so auth refresh doesn't tear down the stream.

## Server pieces

- Router: `server/src/routes/notificationRoutes.ts` mounted at `/api/notifications` **with no app-level guard** (`app.ts` mounts it without middleware) — each route applies its own guard. This mount is guard-free because it also serves public-ish app-config reads (see below).
- Controller: `server/src/controllers/NotificationController.ts` — direct Mongoose access, **every query scoped by `userId`** (ownership enforced in the query):
  - `GET /` (`requireAuth`+`requireActive`) → `getMyNotifications`: `find({userId}).sort({createdAt:-1}).limit(50)` (inbox capped at 50).
  - `PATCH /read-all` (declared before `/:id/read`) → `updateMany({userId, read:false}, {read:true})`.
  - `PATCH /:id/read` → `findOneAndUpdate({_id, userId}, {read:true})`; `404` if not found/not owned.
  - `DELETE /:id` → `findOneAndDelete({_id, userId})`; `404` if not found/not owned.
- SSE + config reads defined **inline in the router** (not the controller):
  - `GET /subscribe` (`requireAuthSSE` + `requireActive`) — `requireAuthSSE` accepts the JWT via `Authorization` header **or** `?token=<jwt>`. Sets `text/event-stream` headers, flushes `: ok`, enables socket keep-alive with no timeout, registers via `notificationManager.addClient(user.id, user.isRoot, res, user.role === 'admin')`, and unsubscribes on `req.on('close')`.
  - `GET /nav-settings`, `GET /branding`, `GET /sounds` (`requireAuth`+`requireActive`) — inline handlers reading `readAppConfig()`, defensively returning defaults (`200`) on any error. These expose admin-configured settings to all users, which is why the client `config.getNavSettings`/`getBranding` and the notification-sound read hit this mount rather than `/api/config`.
- Dispatcher: `server/src/services/NotificationManager.ts` — a **singleton, in-memory, process-local** registry of SSE connections (`Set<NotificationClient>` = `{userId, isRoot, isAdmin, res}`). Methods: `addClient` (adds + sends immediate `handshake`, returns a cleanup closure), `sendToUser`, `sendToRootAdmins`, `sendToAdmins` (isAdmin includes root), `broadcast`. A 30s `setInterval` (`.unref()`ed) writes `: ping` comments to keep connections alive; any `res.write` failure reaps that dead client from the Set.
- Persistence: `Notification` model. Persistent notifications are created by services (e.g. `FeatureRequestService.notify` saves a `Notification` then calls `notificationManager.sendToUser(userId, 'notification', notif)`); purely live nudges (e.g. issue-reported) call the manager without persisting.

## Data model

**`Notification`** (collection `notifications`, `server/src/models/Notification.ts`): `userId`→User (required, field-indexed), `type` (system/mention, default system), `title` (req), `message` (req), `link`, `read` (default false), `createdAt` only (`timestamps: { createdAt:true, updatedAt:false }`). No `updatedAt`.

Note the client `Notification` interface carries a broader set of `type` strings (e.g. `user-activity`, `access-change`) used for live SSE events and icon selection; those live event types are not necessarily persisted as `Notification` documents.

## Notable behaviors & edge cases

- **Not durable across instances / serverless:** `NotificationManager` is per-process. Multiple server instances (serverless/multi-node) do not share connected clients, so a live event emitted on instance A won't reach a client connected to instance B. The 60s poll of `['notifications']` is the safety net that surfaces any missed persisted notifications.
- **No app-level guard on the mount** is intentional — per-route guards protect the authed endpoints; `requireAuthSSE` handles the header-less EventSource; the three config-read endpoints are meant to be broadly readable and fail open to defaults.
- **Password-reset requests notify admins:** the forgot-password flow (`POST /api/auth/password-reset-request`) records the request and notifies admins, surfacing as a `password-reset-request` SSE event (client toasts a warning to admins).
- **`access-change` triggers auth refresh:** receiving one calls `refreshMe()` so a suspended/role-changed user's permissions update live without a page reload.
- **Dead-socket reaping is lazy:** broken connections are only pruned on the next write or the 30s ping — up to ~30s of staleness.
- **Role captured at connect time:** `addClient` snapshots `isRoot`/`isAdmin`; a mid-connection role change is not reflected until reconnect.
- **Bounded reconnect:** client stops reconnecting after 6 error bursts within 5s windows and relies on polling; a fresh `userId` (login) re-establishes the stream.
- **Ownership:** all inbox operations are scoped by `userId` in the query itself; there is no cross-user access path.

## Related docs

- Client: [NotificationBell](../files/client/components/layout/NotificationBell.md), [NotificationContext](../files/client/contexts/NotificationContext.md), [notifications service](../files/client/services/notifications.md)
- Server: [notificationRoutes](../files/server/routes/notificationRoutes.md), [NotificationController](../files/server/controllers/NotificationController.md), [NotificationManager](../files/server/services/NotificationManager.md), [Notification model](../files/server/models/Notification.md)
- API: [server-api-endpoints](../api/server-api-endpoints.md) §14 (and §1.6 SSE) · [client-endpoint-map](../api/client-endpoint-map.md)
- Related features: [Issues & feature requests](issues-and-feature-requests.md) (emit notifications), [Auth & users](auth-and-users.md) (password-reset + access-change events)
