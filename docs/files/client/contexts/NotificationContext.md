# `client/src/contexts/NotificationContext.tsx`
**Purpose:** Notifications state — merges DB-persisted notifications (React Query, polled every 60s) with realtime ones received over a Server-Sent Events (SSE) stream, plays sounds, toasts new events, and exposes read/clear actions. Also loads and caches the system sound configuration and triggers auth refresh on access changes.
**Language / Size:** TSX / 9479 bytes

## Exports (Provider, hook, types, functions)
- `Notification` — exported interface.
- `NotificationProvider({ children })` — provider.
- `useNotifications()` — hook; throws `'useNotifications must be used within a NotificationProvider'`.
- `NotificationContextValue` — interface (internal).

## Imports (Internal / External)
Internal:
- `useAuth` from `./AuthContext`
- `getToken`, `api` from `@/services/api`
- `playSound`, `setCachedSoundConfig` from `@/lib/sound`
- `getMyNotifications`, `markAsRead as markAsReadApi`, `markAllAsRead as markAllAsReadApi` from `@/services/notifications`

External:
- `react` (`createContext`, `useContext`, `useState`, `useEffect`, `useMemo`, `useRef`)
- `@tanstack/react-query` (`useQuery`, `useMutation`, `useQueryClient`)
- `sonner` (`toast`)

## Context shape (the value object)
```ts
interface NotificationContextValue {
  notifications: Notification[];   // merged + sorted (newest first)
  unreadCount: number;             // count of !read
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;  // clears only realtime ones
}
interface Notification { _id?; id?; title; message; type: string; createdAt: Date; read: boolean; link?; }
```

## State managed & how it's updated
- `dbNotifications` — from `useQuery(['notifications'], getMyNotifications)`, `enabled: !!user`, `refetchInterval: user ? 60_000 : false`.
- `realtimeNotifications: Notification[]` (`useState`, init `[]`) — prepended per SSE event; cleared when `userId` becomes null and by `clearNotifications`.
- `notifications` — `useMemo([realtimeNotifications, dbNotifications])`: realtime first, then DB items not already present by `_id`, sorted by `createdAt` desc.
- `unreadCount` — derived (`notifications.filter(!read).length`).
- `refreshMeRef` — `useRef` mirroring `refreshMe` (updated every render) to avoid tearing down the SSE stream on auth refresh.
- `userId = user?._id ?? null`.
- Mutations: `markAsReadMutation`, `markAllAsReadMutation` (invalidate `['notifications']` on success).

## Hooks & Effects (deps, purpose, WHY)
- `useQuery` polling — fallback so notifications still arrive if a realtime SSE event is missed (e.g. serverless reconnect to another instance); also drives the axios 401→logout path on token expiry.
- `useMemo` for `notifications` — avoids producing a new array (and re-rendering consumers) each render.
- **Main `useEffect([userId, queryClient])`** — the SSE subscription:
  - Bails/clears realtime if no `userId`; bails if no token.
  - Local error-burst tracking (`errorBurst`, `lastErrorAt`).
  - `api.get('/notifications/sounds')` → `setCachedSoundConfig(data)` (warns on failure).
  - Opens `new EventSource('/api/notifications/subscribe?token=…')`.
  - Listeners: `handshake` (resets errorBurst, logs), `user-activity` (root-admin; builds notif, plays sound, `toast.info`), `access-change` (builds notif, plays sound, `toast.success`, then `refreshMeRef.current()` to refresh permissions/roles instantly), `password-reset-request` (admins; `toast.warning`), `notification` (general; merges, invalidates `['notifications']`, `toast`).
  - `onerror` — increments burst if within 5s; closes for good if token gone; after `errorBurst >= 6` closes and falls back to polling; otherwise lets EventSource auto-reconnect.
  - Cleanup closes the EventSource.
  - WHY `refreshMeRef`: keep the latest `refreshMe` without listing the (unstable) function in deps, else the SSE stream would reconnect on every auth refresh.

## Functions (purpose, algorithm, side effects)
- `markAsRead(id)` — optimistically marks the matching realtime notif read (by `_id` or `id`), then `markAsReadMutation.mutate(id)`.
- `markAllAsRead()` — optimistically marks all realtime read, then `markAllAsReadMutation.mutate()`.
- `clearNotifications()` — empties `realtimeNotifications` only (does not touch DB).

## Consumed by
`components/layout/NotificationBell.tsx`. (Not exhaustively verified beyond this match.)

## Important logic & design patterns
- Hybrid realtime (SSE) + polling model with graceful degradation: bounded reconnect (burst >= 6 → stop) with the 60s poll as safety net.
- Token passed as a query param on the SSE URL (EventSource cannot set headers).
- Optimistic UI for read-state, reconciled by query invalidation.
- Realtime `access-change` events trigger `refreshMe` so role/permission changes apply without reload.
