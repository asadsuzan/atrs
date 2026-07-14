# `client/src/pages/Products.tsx`

**Purpose / Route:** Product catalog management page mounted at `/products`. Lists products with search/category/status/owner filters, grid & table views, per-page bulk selection + bulk delete (via job stream), inline edit dialog, and per-row delete. Owner filter is admin-only.
**Language / Size:** TSX / 21545 bytes

## Exports
- `default function Products()` — the page component (no named exports).

## Imports (Internal / External)
**External:**
- `react` — `useState`, `useEffect`
- `react-router-dom` — `Link`
- `@tanstack/react-query` — `useQuery`, `useMutation`, `useQueryClient`
- `lucide-react` — `Plus`, `Search`, `Edit2`, `Trash2`, `GitBranch`, `Globe`
- `framer-motion` — `motion`
- `sonner` — `toast`

**Internal (services):**
- `../services/products` — `getProducts`, `deleteProduct`, `updateProduct`
- `../services/users` — `getUsers`

**Internal (contexts):**
- `../contexts/AuthContext` — `useAuth`
- `../contexts/WpImportContext` — `useWpImport`
- `../contexts/AddProductContext` — `useAddProduct`
- `../contexts/JobStreamContext` — `useJobStream`
- `../contexts/ConfirmContext` — `useConfirm`

**Internal (hooks):**
- `../hooks/useLocalStorage` — `useLocalStorage`
- `../hooks/useDebouncedValue` — `useDebouncedValue`

**Internal (lib / components):**
- `@/lib/sound` — `playSound`
- `@/components/ui/button` — `Button`
- `@/components/ui/checkbox` — `Checkbox`
- `@/components/ui/table` — `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`
- `@/components/ui/dialog` — `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`
- `@/components/ui/input` — `Input`
- `@/components/ui/badge` — `Badge`
- `@/components/ui/select` — `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `@/components/ui/Pagination` — `Pagination`
- `@/components/ui/ViewToggle` — `ViewToggle`, type `ViewMode`
- `@/components/ui/skeleton` — `Skeleton`
- `@/components/ui/skeletons` — `ProductCardSkeleton`
- `../components/products/ProductForm` — `ProductForm`
- `../components/products/ProductsEmptyState` — `ProductsEmptyState`
- `../components/products/ProductWpStats` — `ProductWpStats`
- `../components/layout/PageTransition` — `PageTransition` (default)

## Component tree & sub-components defined
No sub-components defined in-file (single default component). Renders:
- `PageTransition` root
  - Header (title + "Add Product" button → `openAddProduct`)
  - Filter bar (`Input` search, category `Select`, status `Select`, owner `Select` [admin only])
  - Bulk-action bar (shown when `selectedIds.size > 0`) with destructive "Delete N" button
  - `ProductsEmptyState` (when not loading/errored and zero products)
  - Select-all checkbox (grid view) + `ViewToggle`
  - Table view (`Table` with skeleton/error/empty/data rows; `motion.tr` rows)
  - Grid view (`motion.div` cards; `ProductCardSkeleton` while loading; embeds `ProductWpStats` when `product.wpOrgSlug`)
  - `Pagination`
  - Edit `Dialog` wrapping `ProductForm`

## State / Refs / Context consumed
**Local state:**
- `search` (`useLocalStorage 'atrs_products_search'`), `debouncedSearch` (300ms debounce of `search`)
- `category` (`useLocalStorage 'atrs_products_category'`, default `'all'`)
- `status` (`useLocalStorage 'atrs_products_status'`, default `'all'`)
- `ownerId` (`useState`, default `'all'`)
- `page` (`useState`, default `1`)
- `limit` (`useLocalStorage 'atrs_products_limit'`, default `10`)
- `view` (`useLocalStorage<ViewMode> 'atrs_products_view'`, default `'grid'`)
- `editingProduct` (`useState<any>`, default `null`)
- `selectedIds` (`useState<Set<string>>`, default empty Set)

**Context:** `confirm` (ConfirmContext), `queryClient`, `isAdmin` (AuthContext), `open: openWpImport` (WpImportContext), `openAddProduct` (AddProductContext), `runJob` + `isRunning: isJobRunning` (JobStreamContext).

## Hooks & Effects (deps, purpose, WHY)
- `useDebouncedValue(search, 300)` — debounces search input to avoid a query per keystroke.
- `useEffect(() => setSelectedIds(new Set()), [page, debouncedSearch, category, status, ownerId])` — clears the bulk selection whenever the page or any filter changes, so selections don't leak across differing result sets (comment: "Clear selection when page or filters change").

## Data fetching (services/endpoints; react-query keys/mutations)
- **Query** `['products', queryParams]` → `getProducts(queryParams)`. `queryParams` = `{ page, limit }` plus conditionally `search`, `category`, `status`, `ownerId`. Returns `{ data, totalPages }`.
- **Query** `['users']` → `getUsers()`, `enabled: isAdmin` (populates the owner filter; only fetched for admins).
- **Mutation** `updateMutation` → `updateProduct`; on success plays `'success'` sound, toasts, invalidates `['products']`, closes edit dialog; on error plays `'error'` sound + error toast.
- **Mutation** `deleteMutation` → `deleteProduct`; on success plays `'delete'` sound, toasts, invalidates `['products']`; on error plays `'error'` sound + error toast.
- **Job stream** bulk delete via `runJob({ url: '/products/bulk-delete-stream', body: { ids } })` (streaming endpoint, not react-query), invalidates `['products']` on done.

## Event handlers & key functions
- `toggleSelectAll()` — adds/removes all products on the current page to/from `selectedIds`.
- `toggleOne(id)` — toggles a single product id in `selectedIds`.
- `allOnPageSelected` / `someOnPageSelected` — derived selection state for checkbox (indeterminate) UI.
- `handleBulkDelete()` — confirms via `confirm(...)`, then `runJob` against `/products/bulk-delete-stream` with selected ids; clears selection and invalidates on done.
- Per-row delete — inline `onClick` confirming then `deleteMutation.mutate(product._id)` (in both table and grid views).
- Edit — `setEditingProduct(product)` opens the dialog; on submit `updateMutation.mutate({ id, ...data })`.
- Filter change handlers reset `setPage(1)`.

## Rendered UI sections
Header/add button; filter bar; bulk-action bar; empty state; view toggle + select-all; table view; grid view (cards with icon, name link, category/status badges, WP stats, GitHub + wordpress.org links, hover edit/delete); pagination; edit dialog.

## Important logic & design patterns
- Filter persistence via `useLocalStorage` (search, category, status, limit, view) so choices survive reloads; `ownerId` and `page` are ephemeral `useState`.
- Debounced search to limit query churn.
- `Set<string>`-based bulk selection scoped to the current page; indeterminate checkbox via `data-state`.
- Bulk delete uses a streaming job (JobStreamContext) rather than a plain mutation, with a `confirm()` gate and a warning about cascading deletion (activities, versions, marketing, media).
- Sound feedback (`playSound`) tied to mutation outcomes.
- `framer-motion` staggered entrance animations for rows/cards (`delay: index * 0.05` table; `Math.min(index * 0.04, 0.3)` grid).
- Grid cards conditionally render `ProductWpStats` and the wordpress.org link only when `product.wpOrgSlug` is present; `githubUrl` links out for all.
- Edit dialog picks `ProductForm` variant `'standalone'` vs `'full'` based on `product.category === 'standalone'`.

## Relationships
- Depends on multiple app-wide contexts (Auth, WpImport, AddProduct, JobStream, Confirm) — implying it is rendered within their providers.
- Links to product detail pages `/products/:id` via `Link`.
- Shares the `['products']` query cache with other pages (e.g. AuditLogs also queries `['products']`); invalidations here refresh those.
- Delegates add-product and WordPress-import flows to context-provided modals rather than owning them.
