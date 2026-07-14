# `client/src/components/layout/CommandPalette.tsx`
**Purpose:** A ⌘K / Ctrl+K command palette (searchable dialog) for jumping to app routes, products, and recent activities.
**Language / Size:** TSX / 4734 bytes

## Exports
- `CommandPalette` (named function component, no props)

## Imports (Internal / External)
- Internal: `getProducts` from `../../services/products`; `getActivities` from `../../services/activities`; `useAuth` from `../../contexts/AuthContext`; UI primitives `CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList` from `@/components/ui/command`.
- External: `useState, useEffect` (react); `useNavigate` (react-router-dom); `useQuery` (@tanstack/react-query); icons `LayoutDashboard, Package, Activity, BarChart2, History, Image as ImageIcon, Users as UsersIcon, HelpCircle, Settings, Lightbulb` (lucide-react).

## Props
None.

## State / Refs / Context consumed
- State: `open` (boolean) — dialog open state.
- Context: `useAuth()` → `isAdmin` (gates the Users command item).

## Hooks & Effects (deps, purpose)
- `useEffect([], mount)`: registers a `keydown` listener on `document`; on `k` + (`metaKey` || `ctrlKey`) it `preventDefault()`s and toggles `open`. Cleans up on unmount.
- `useQuery(['products','palette'])` → `getProducts({ limit: 100 })`.
- `useQuery(['activities'])` → `getActivities({ limit: -1 })`.

## Functions & handlers
- `runCommand(command)`: closes the dialog then executes the passed callback.
- Navigation item `onSelect` handlers call `runCommand(() => navigate(path))`.
- Activity item handler navigates to `/products/{productId}#activity-{_id}` handling both populated (`a.productId._id`) and raw-id (`a.productId`) shapes.

## Rendered UI
`CommandDialog` containing `CommandInput` (placeholder "Type a command or search...") and `CommandList` with `CommandEmpty` ("No results found."). Groups:
- "Navigation": Dashboard `/`, Products `/products`, Changelogs `/activities`, Media Library `/media`, Reports `/reports`, Audit Logs `/audit-logs`, Feature Requests `/feature-requests`, Users `/users` (admin only), Help & Demos `/help`, Settings `/settings`.
- "Products": one item per product → `/products/{_id}` (shown only if products exist).
- "Recent Activities": first 5 activities (shown only if activities exist).

## Important logic & design patterns
- Global keyboard shortcut binding for ⌘K/Ctrl+K.
- `products` and `activities` default to `[]` from `?.data || []`.
- Products query fetches up to 100; activities query fetches all (`limit: -1`) but only slices the first 5 for display.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- Uses `AuthContext` (`isAdmin`). Does not use JobStream/ChangelogGen/WindowManager/Notification contexts.
- Mounted as a global surface (typically in App.tsx layout) so the shortcut works app-wide.
