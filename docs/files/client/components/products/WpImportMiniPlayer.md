# `client/src/components/products/WpImportMiniPlayer.tsx`
**Purpose:** Floating "picture-in-picture" view of an in-flight WordPress.org import, pinned at the app root (bottom-right dock) so a minimized import keeps showing progress across every page.
**Language / Size:** TypeScript(React) / 3967 bytes

## Exports
- `WpImportMiniPlayer()` (named component, no props).

## State / Refs / Context consumed
- `useWpImport()` → `isMinimized, restore, close, isImporting, isCancelling, progress, summary, logs, requestCancel`.
- `DockBoard` (`../../contexts/JobDockContext`) wraps the UI with `id="wp-import"`, `order={0}`.

## Behavior / Rendering
- Returns `null` unless `isMinimized`.
- Header: terminal icon, "WordPress.org import" title, Restore (`Maximize2`) button, and Close (`X`) only when not importing.
- Body: status line (spinner while importing) + percentage; a progress bar; the last log line (`[slug] message`); and a "Cancel & roll back" button while importing (disabled/"Cancelling…" when `isCancelling`).

## Important logic / algorithms
- `pct`: 100 while cancelling; else `round(current/total*100)` when `progress`; else 5% (importing) / 100% (done).
- `statusText`: cancelling → "Cancelling — rolling back…"; importing with progress → "Plugin N of M"; importing without → "Starting…"; done → cancelled ("Cancelled · N rolled back"), or summary ("Done · X created · Y updated"), else "Finished".
- `barColor`: amber when cancelling/cancelled/has errors, else primary; pulses while cancelling.

## Relationships
- Consumes `WpImportContext` and `JobDockContext`. The expanded counterpart is `WpOrgImportDialog` (`restore()` reopens it). Mounted at the app root alongside other dock boards (`FramerExportBoard`).

## Edge cases & known limitations
- Only visible when an import has been minimized; closing is blocked while an import is still running (no Close button then).
