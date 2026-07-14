# `client/src/pages/AuditLogs.tsx`

**Purpose / Route:** Audit logs page mounted at `/audit-logs`. Paginated, filterable table of system audit records (create/update/delete across entity types). Filters: free-text search, entity type, action, user (admin only), and start/end date range.
**Language / Size:** TSX / 10296 bytes

## Exports
- `default function AuditLogs()` — the page component.

## Imports (Internal / External)
**External:**
- `react` — `useState`
- `@tanstack/react-query` — `useQuery`
- `date-fns` — `format`
- `lucide-react` — `Search`, `History`, `X`

**Internal (services):**
- `../services/auditLogs` — `getAuditLogs`
- `../services/products` — `getProducts`
- `../services/users` — `getUsers`

**Internal (contexts / hooks):**
- `../contexts/AuthContext` — `useAuth`
- `../hooks/useDebouncedValue` — `useDebouncedValue`

**Internal (components):**
- `@/components/ui/table` — `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`
- `@/components/ui/card` — `Card`
- `@/components/ui/input` — `Input`
- `@/components/ui/select` — `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `@/components/ui/DatePicker` — `DatePicker`
- `@/components/ui/badge` — `Badge`
- `@/components/ui/button` — `Button`
- `@/components/ui/Pagination` — `Pagination`
- `@/components/ui/skeletons` — `TableRowSkeleton`
- `../components/layout/PageTransition` — `PageTransition` (default)

## Component tree & sub-components defined
No in-file sub-components. Render tree: `PageTransition` → header (`History` title + subtitle) → filter bar → `Card` wrapping the `Table` → `Pagination`.

## State / Refs / Context consumed
**Local state (all `useState`):**
- `page` (1), `limit` (15)
- `entityType` ('all'), `action` ('all'), `userId` ('all')
- `search` (''), `debouncedSearch` (300ms debounce of `search`)
- `startDate` (''), `endDate` ('')

**Context:** `isAdmin` (AuthContext).

## Hooks & Effects (deps, purpose, WHY)
- `useDebouncedValue(search, 300)` — debounces search text so the query is not refetched on every keystroke.
- No `useEffect`.

## Data fetching (services/endpoints; react-query keys/mutations)
- **Query** `['auditLogs', queryParams]` → `getAuditLogs(queryParams)`. `queryParams` = `{ page, limit }` plus conditionally `entityType`, `action`, `userId`, `search`, `startDate`, `endDate`. Returns `{ data, totalPages }`.
- **Query** `['products']` → `getProducts()` — used to resolve product names for ACTIVITY-type log rows.
- **Query** `['users']` → `getUsers()`, `enabled: isAdmin` — populates the user filter (admin only).
- No mutations (read-only page).

## Event handlers & key functions
- `getProductName(entityId)` — finds a product by `_id` in the products list, returns its name or `null`.
- `clearFilters()` — resets all filters and page to defaults; the "Clear" button is shown only when any filter is active.
- Every filter change handler also calls `setPage(1)`.

## Rendered UI sections
- Header: `History` icon + "Audit Logs" + subtitle.
- Filter bar: search `Input`; entity type `Select` (all, PRODUCT, ACTIVITY, VERSION, MARKETING, ISSUE, FEATURE_REQUEST); action `Select` (all, CREATE, UPDATE, DELETE); user `Select` (admin only); From/To `DatePicker`s (with `max`/`min` cross-bounds, clearable); conditional "Clear" button.
- Table (`Card`): columns Date & Time, User, Action, Entity Type, Entity Name, Details. States: `TableRowSkeleton` while loading (8 rows, 6 cols), error row, empty row, or data rows.
- Row rendering: date `format 'MMM d, yyyy HH:mm:ss'`; user `log.userId?.name || log.userName || "System"`; action Badge color-coded (CREATE green / DELETE red / else blue); entity type Badge (lowercased); entity name (for ACTIVITY, appends resolved product name parsed from `log.details` via regex `productId: ([a-f0-9]+)`); details text.
- `Pagination` with `limitOptions={[15, 25, 50, 100]}`.

## Important logic & design patterns
- Read-only reporting view; all state is ephemeral `useState` (no persistence).
- Debounced search; every filter change resets pagination to page 1.
- Product-name enrichment: ACTIVITY logs reference a product id embedded in the `details` string; a regex extracts it and `getProductName` resolves it from the separately-fetched products list.
- Admin-gated user filter via `enabled: isAdmin`.
- Color-coded action badges (light/dark variants) for quick scanning.
- Date range filtering with mutually-bounding pickers (`startDate` as `min` for end, `endDate` as `max` for start).

## Relationships
- Shares the `['products']` and `['users']` query caches with other pages (e.g. Products), benefiting from react-query caching.
- Entity types mirror auditable domain objects across the app (products, activities, versions, marketing, issues, feature requests).
- Consumes AuthContext for admin gating; no writes, so no invalidations.
