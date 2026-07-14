# `client/src/pages/MediaManager.tsx`
**Purpose / Route:** Media Library page — browse, inspect usage references, and clean up uploaded media files. Route `/media` (per assignment; not verified in this file).
**Language / Size:** TSX / 36896 bytes

## Exports
- `default function MediaManager()` — the page component. No named exports.

## Imports (Internal / External)
Internal:
- `../services/media` → `getMediaList`, `deleteMedia`, `bulkDeleteMedia`, type `IMediaFile`
- `../contexts/JobStreamContext` → `useJobStream`
- `../services/products` → `getProducts`
- `../components/layout/PageTransition` (default)
- `@/lib/sound` → `playSound`
- UI: `@/components/ui/button` (Button), `@/components/ui/input` (Input), `@/components/ui/badge` (Badge), `@/components/ui/card` (Card, CardContent, CardHeader, CardTitle), `@/components/ui/select` (Select, SelectContent, SelectItem, SelectTrigger, SelectValue), `@/components/ui/dialog` (Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose)

External:
- `react` → useState, useCallback, useMemo
- `@tanstack/react-query` → useQuery, useMutation, useQueryClient
- `lucide-react` → Image (as ImageIcon), Video (as VideoIcon), Search, Trash2, Copy, Check, FileQuestion, HardDrive, Info, AlertTriangle, RefreshCw, CheckSquare, Square, X
- `sonner` → toast
- `date-fns` → format
- `framer-motion` → motion, AnimatePresence

## Component tree & sub-components defined
Single component `MediaManager`. No sub-components defined in file. Renders inside `<PageTransition>`: header + action buttons; 3 stat `Card`s; filters/controls bar (search Input, product/usage/sort Selects, type tabs, select-all toggle); media grid (`motion.div` cells inside `AnimatePresence`); 4 Dialogs — Details, Delete Confirmation, Bulk Purge Confirmation, Bulk Delete Confirmation; floating bulk-action bar (`motion.div`).

## State / Refs / Context consumed
Context: `useJobStream()` → `runJob`; `useQueryClient()`.
State (useState): `search` (''), `typeFilter` ('all'|'image'|'video'|'gif'), `usageFilter` ('all'|'in-use'|'orphaned'), `productFilter` ('all'), `sortBy` ('date-desc'|'date-asc'|'size-desc'|'size-asc'), `selectedMedia` (IMediaFile|null), `copiedFilename` (string|null), `deleteTarget` (IMediaFile|null), `isPurging` (bool), `selectedFiles` (Set<string>), `isSelecting` (bool), `isBulkDeleteOpen` (bool).
No refs.

## Hooks & Effects (deps, purpose, WHY)
No `useEffect`. 
- `useMemo` × 3: `selectedMediaItems` (deps mediaList, selectedFiles), `selectedInUseCount` (deps selectedMediaItems), `selectedOrphanedCount` (deps selectedMediaItems) — memoised counts for the bulk-delete dialog.
- `useCallback` × 3: `toggleFileSelection` ([]), `toggleSelectAll` ([filteredMedia, selectedFiles.size]), `exitSelectionMode` ([]).
Note (WHY, from source comment): products query key includes `{ limit: 100 }` so the 100-item fetch doesn't collide with the default 1000-item `['products']` cache used by list views.

## Data fetching (services/endpoints; react-query keys/mutations)
Queries:
- `['products', { limit: 100 }]` → `getProducts({ limit: 100 })` (product filter dropdown).
- `['mediaList']` → `getMediaList` (returns `IMediaFile[]`; exposes isLoading, isRefetching, refetch).
Mutations:
- `deleteMutation` → `deleteMedia(filename, force)`; onSuccess plays 'delete', toast, invalidates `['mediaList']`, clears deleteTarget/selectedMedia.
- `bulkDeleteMutation` → `bulkDeleteMedia(filenames, force)`; onSuccess reports deleted/failed counts, invalidates `['mediaList']`, clears selection.
Streamed job (via JobStream, not react-query):
- `startPurge()` → `runJob({ url: '/media/purge-orphaned-stream', noun: 'file', onDone: invalidate ['mediaList'] })`.

## Event handlers & key functions
- `startPurge` — triggers streamed purge of orphaned media.
- `handleCopyUrl(url, filename)` — copies `window.location.origin + url` to clipboard, plays 'click', sets copiedFilename for 2s.
- `formatBytes(bytes, decimals=2)` — human-readable size formatting (Bytes/KB/MB/GB).
- `getMediaType(mime)` — classifies mime into 'gif'|'image'|'video'|'other'.
- `handleDeleteClick(e, media)` — stops propagation, sets deleteTarget.
- `toggleFileSelection`, `toggleSelectAll`, `exitSelectionMode` — selection-mode helpers.

## Rendered UI sections
1. Header: title + Refresh button, Select/Cancel toggle, conditional "Purge Unused (N)" destructive button.
2. Stats cards: Total Uploads, Storage Used (formatBytes total), Unused Media (orphaned count + size).
3. Filters bar: search input, product/usage/sort Selects, media-type tab buttons, select-all toggle (selection mode).
4. Media grid: skeleton loading (10 pulses), empty state, or animated cells with image/video/file preview, selection checkbox, In Use/Unused badge, hover copy/delete actions.
5. Details Dialog: preview + metadata (size, mime, upload date, status) + usage references list + Copy URL / Delete.
6. Delete Confirmation Dialog: force-delete warning listing referencing entities when in use.
7. Bulk Purge Confirmation Dialog.
8. Floating bulk action bar + Bulk Delete Confirmation Dialog (breaks out orphaned vs in-use counts).

## Important logic (upload/R2, filtering)
- Upload/R2: no upload UI in this file; page is read/delete only. Media URLs rendered directly via `media.url`; copy builds absolute URL from `window.location.origin`. R2 not referenced by name in this file — Not determinable from source here.
- Filtering: `filteredMedia` chains search (filename substring, case-insensitive), type filter (via getMediaType), usage filter (isOrphaned), product filter (item.references.some(ref.productId === productFilter)), then sorts by date or size asc/desc.
- Stats: totalFiles, totalSize, orphanedFiles/orphanedCount/orphanedSize computed from mediaList.
- Delete force flag: single delete uses `force: !isOrphaned`; bulk delete uses `force: selectedInUseCount > 0`.

## Relationships
- Depends on `media` service (list/delete/bulkDelete) and `products` service. `IMediaFile` type sourced from media service (fields used: filename, mimeType, size, createdAt, url, isOrphaned, references[{productId, entityType, entityName, field}]).
- Consumes `JobStreamContext` for streamed orphaned-media purge (SSE-style job at `/media/purge-orphaned-stream`).
- Uses shared UI kit, PageTransition layout, and playSound side effects. Details/Delete dialogs cross-reference other entities (products, marketing pages, activities) via `references`.
