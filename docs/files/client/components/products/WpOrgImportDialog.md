# `client/src/components/products/WpOrgImportDialog.tsx`
**Purpose:** The full WordPress.org import dialog: choose import method (by author username or by plugin slug), fetch and multi-select plugins, then stream the import with a live color-coded console, progress bar, and cancel-with-rollback. Minimizes to the mini-player instead of killing a running import.
**Language / Size:** TypeScript(React) / 14735 bytes

## Exports
- `WpOrgImportDialog()` (named component, no props).

## State / Refs / Context consumed
- Module const `LOG_STYLES` keyed by `ImportProgress['type']` (info/success/warn/error) → color + glyph.
- `logEndRef` — sentinel div for console auto-scroll.
- `useWpImport()` → `isOpen, close, minimize, mode, setMode, username, setUsername, plugins, selected, fetched, previewLoading, fetchPlugins, toggle, toggleAll, slugInput, setSlugInput, fetchSlugPlugins, isImporting, isCancelling, logs, progress, summary, startImport, requestCancel`.
- `useEffect([logs, isOpen])`: auto-scrolls the console to bottom.

## Behavior / Rendering
- `handleOpenChange(next)`: closing while `isImporting` → `minimize()`, else `close()`.
- `showConsole = isImporting || logs.length > 0` toggles between the console view and the selection view; a Minimize button appears (left of the built-in X) once console is shown.
- Console view: progress bar (label + %, amber on cancel/errors, pulsing while cancelling; width 100% cancelling / `current/total%` / 5% importing / 100% done), live console (timestamp + glyph + `[slug] message`, plus a working/rolling-back spinner row), and a footer with a summary line + Cancel-&-roll-back (importing) or Close (done).
- Selection view: method switch (By username vs By plugin slug); an input + Fetch button (Enter submits, spinner while `previewLoading`) with helper text; when `fetched && plugins.length`, a select-all row + selection count, a scrollable plugin list (icon, name, category badge, "Will update" badge for `alreadyImported`, short description, click/checkbox toggle), and a footer showing `toCreate`/`toUpdate` breakdown + Cancel and "Import N products" (disabled when none selected or importing).

## Important logic / algorithms
- `allSelected = plugins.length > 0 && every selected`; `toUpdate` counts selected slugs whose plugin `alreadyImported`; `toCreate = selected.size - toUpdate`.
- All import state/actions live in `WpImportContext`; this component is a view over it (mirrors `JobStreamDialog`'s minimize-on-close pattern).

## Relationships
- Consumes `WpImportContext`; paired with `WpImportMiniPlayer` (minimized view) via `minimize()`/`restore()`. Import types (`ImportProgress`) from `../../services/products`. Reached from `AddProductDialog` (import path) and `ProductsEmptyState`.

## Edge cases & known limitations
- Slug mode accepts several comma-separated slugs.
- Closing during an import never cancels — it hands off to the mini-player; cancellation is explicit and rolls back created records.
