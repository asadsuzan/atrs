# `client/src/components/layout/NotificationBell.tsx`
**Purpose:** Header bell icon with an unread badge that opens a popover listing real-time notifications, with mark-read / mark-all-read / clear-all actions.
**Language / Size:** TSX / 5876 bytes

## Exports
- `NotificationBell` (named function component, no props)

## Imports (Internal / External)
- Internal: `useNotifications` from `@/contexts/NotificationContext`; UI `Popover, PopoverTrigger, PopoverContent` from `@/components/ui/popover`; `Button` from `@/components/ui/button`.
- External: `useState` (react); `formatDistanceToNow` (date-fns); icons `Bell, CheckCheck, Trash2, Activity, ShieldAlert, Key, UserCheck, Inbox` (lucide-react).

## Props
None.

## State / Refs / Context consumed
- State: `isOpen` (boolean) — popover open state.
- Context: `useNotifications()` → `notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications`.

## Hooks & Effects (deps, purpose)
None beyond `useState`.

## Functions & handlers
- `getIcon(type, message)`: maps notification `type` to an icon. `user-activity` → `Activity` (sky). `access-change` → branches on lowercased `message`: contains "suspend" → `ShieldAlert` (destructive), contains "role" → `Key` (amber), else `UserCheck` (emerald). Default → `Inbox`.
- Notification row `onClick`: `!notif.read && markAsRead(notif._id || notif.id!)`.
- Mark-all-read button → `markAllAsRead()`. Clear-all button → `clearNotifications()`.

## Rendered UI
- Trigger: circular button with `Bell`; when `unreadCount > 0` a destructive badge shows the count.
- `PopoverContent` (w-80/md:w-96): header ("Notifications" + "{n} new" pill + "Mark all read"); scrollable list (`max-h-80`) with an empty state ("No notifications yet"); each row shows the type icon, title (with unread dot), message, and relative time via `formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })`; footer with "Clear all" (shown only when notifications exist).
- Unread rows styled `bg-primary/5`; read rows `bg-card`.

## Important logic & design patterns
- Dual id handling (`notif._id || notif.id`) for server- vs client-sourced notifications.
- Message-content heuristic to choose the access-change icon.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- Consumes `NotificationContext`. Rendered in the app header/global chrome.
