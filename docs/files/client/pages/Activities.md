# `client/src/pages/Activities.tsx`
**Purpose / Route:** Changelogs page — list, filter, sort, create, edit, delete, and bulk-manage changelog/activity entries. Route `/activities` (per assignment; not verified in this file). Page title rendered as "Changelogs".
**Language / Size:** TSX / 32517 bytes

## Exports
- `default function Activities()` — the page component. No named exports.

## Imports (Internal / External)
Internal:
- `../services/activities` → `getActivities`, `createActivity`, `deleteActivity`, `updateActivity`, `bulkUpdateActivities`
- `../services/products` → `getProducts`
- `../services/users` → `getUsers`
- `../contexts/AddProductContext` → `useAddProduct`
- `../contexts/AuthContext` → `useAuth`
- `../contexts/ConfirmContext` → `useConfirm`
- `../contexts/JobStreamContext` → `useJobStream`
- `../components/activities/ActivityForm` → `ActivityForm`
- `../components/layout/PageTransition` (default)
- `../hooks/useLocalStorage` → `useLocalStorage`
- `../hooks/useDebouncedValue` → `useDebouncedValue`
- `@/lib/sound` → `playSound`
- UI: button, table (Table/TableBody/TableCell/TableHead/TableHeader/TableRow), dialog (Dialog/DialogContent/DialogHeader/DialogTitle), badge, `@/components/ui/Pagination` (Pagination), `@/components/ui/ViewToggle` (ViewToggle + type ViewMode), select, input, `@/components/ui/DatePicker` (DatePicker), checkbox, skeleton (Skeleton), `@/components/ui/skeletons` (ChangelogCardSkeleton)

External:
- `react` → useState, useEffect
- `react-router-dom` → Link, useSearchParams
- `@tanstack/react-query` → useQuery, useMutation, useQueryClient
- `lucide-react` → Plus, Edit2, Trash2, ArrowUpDown, Bug
- `date-fns` → format
- `framer-motion` → motion
- `sonner` → toast

## Component tree & sub-components defined
`Activities` (default). Local inline component `SortIcon({ field })` — renders ArrowUpDown with opacity by active sort. Renders `ActivityForm` in Add and Edit dialogs. Two view modes: table view (`Table`) and grid view (cards). Floating bulk-action bar (`motion.div`) when rows selected.

## State / Refs / Context consumed
Contexts: `useConfirm()` → confirm; `useJobStream()` → runJob; `useQueryClient()`; `useAuth()` → isAdmin; `useAddProduct()` → openAddProductFirst.
State — persisted via `useLocalStorage`: `productId` (atrs_activities_productId, 'all'), `type` (atrs_activities_type), `tier` (atrs_activities_tier), `tagFilter` (atrs_activities_tag), `versioned` (atrs_activities_versioned), `search` (atrs_activities_search), `startDate`, `endDate`, `limit` (atrs_activities_limit, 10), `sortBy` (activityDate), `sortOrder` (desc), `view` (atrs_activities_view, 'table').
State — plain useState: `page` (1), `selectedIds` (string[]), `ownerId` ('all'), `isAddOpen`, `editingActivity` (any|null).
Derived: `debouncedSearch = useDebouncedValue(search, 300)`.
No refs.

## Hooks & Effects (deps, purpose, WHY)
- `useEffect` #1 — deps: [page, debouncedSearch, productId, type, tier, tagFilter, versioned, startDate, endDate, sortBy, sortOrder, ownerId] → `setSelectedIds([])`. WHY (source comment): clear bulk selection when page/filters change so bulk actions never operate on rows no longer visible.
- `useEffect` #2 — deps: [searchParams] → reads `?productId`, `?versioned` (none|has|all), `?tag` (released|unreleased) from URL and pre-applies filters + resets page. WHY: lets sidebar/other links pre-filter. (eslint exhaustive-deps disabled.)

## Data fetching (services/endpoints; react-query keys/mutations)
Queries:
- `['activities', queryParams]` → `getActivities(queryParams)`; queryParams built from page, limit, sortBy, sortOrder + optional productId/type/tier(only when type==='feature')/tags/versioned/search/startDate/endDate/ownerId.
- `['products']` → `getProducts()` (default fetch).
- `['users']` → `getUsers()`, `enabled: isAdmin` (owner filter, admin only).
Mutations:
- `createMutation` → `createActivity`; onSuccess sound 'success', toast, invalidate `['activities']`, close add dialog.
- `updateMutation` → `updateActivity`; onSuccess similar, clears editingActivity.
- `deleteMutation` → `deleteActivity`; onSuccess sound 'delete', invalidate.
- `bulkUpdateMutation` → `bulkUpdateActivities(ids, update)`; onSuccess clears selection, invalidate.
Streamed job:
- `runBulkDelete(ids)` → `runJob({ url: '/activities/bulk-delete-stream', body: { ids }, noun: 'entry', onDone: clear selection + invalidate })`.

## Event handlers & key functions
- `handleSort(field)` — toggles sortOrder if same field else sets field + desc; resets page.
- `handleSelectAll(checked)` / `handleSelectOne(id, checked)` — selection management.
- `getTypeColor(t)` — badge color classes for feature/improvement/bug-fix.
- `openEditActivity(activity)` — normalizes activity into edit form shape (productId._id, formatted activityDate 'yyyy-MM-dd', tags default []).
- `confirmDeleteActivity(activity)` — awaits confirm dialog then deletes.
- Add button: if no products and not loading → `openAddProductFirst()`, else open add dialog.

## Rendered UI sections
1. Header: "Changelogs" title + "Add Changelog Entry" button + Add dialog (ActivityForm).
2. Filter bar Row 1: search input; Selects for product, type, tier (only if type==='feature'), tag, versioned, and owner (admin only).
3. Filter bar Row 2: date range (DatePicker From/To with min/max linkage, clear dates), "Reset all filters" button when any filter active.
4. Select-all (grid) + ViewToggle.
5. Table view: sortable columns (Date, Type, Title), checkboxes, badges (PRO/RELEASED/UNRELEASED/related-issues Bug count), edit/delete actions; skeleton/error/empty states.
6. Grid view: card layout with same badges + version label, edit/delete on hover; ChangelogCardSkeleton loading.
7. Pagination (page + limit control).
8. Floating bulk bar: Mark Released, Mark Unreleased, Delete (confirm → streamed bulk delete).
9. Edit dialog (ActivityForm keyed by _id).

## Important logic (activity CRUD/bulk)
- CRUD via activities service mutations (create/update/delete). On submit (add & edit) empty `mediaType`/`mediaUrl` are coerced to null.
- Bulk tag ops: `bulkUpdateMutation` with `{ addTags:['released'], removeTags:['unreleased'] }` (Mark Released) and inverse (Mark Unreleased).
- Bulk delete is a streamed job (`/activities/bulk-delete-stream`) not a plain mutation, because it also removes associated media files (per confirm copy).
- Links: title links to `/products/{productId._id}#activity-{_id}`; review-queue related-issue count shown via `relatedIssueIds`.
- Tier filter only meaningful for type 'feature'; only added to queryParams then.

## Relationships
- Depends on `activities`, `products`, `users` services.
- Consumes AuthContext (isAdmin gates owner filter/users query), AddProductContext (empty-state add flow), ConfirmContext (delete confirmations), JobStreamContext (streamed bulk delete).
- Renders `ActivityForm` for create/edit; shares filter state across sessions via useLocalStorage; cross-links to Products pages.
