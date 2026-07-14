# `client/src/components/jobs/JobStreamMiniPlayer.tsx`
**Purpose:** Floating picture-in-picture view of a minimized-but-running bulk/cascade job, pinned bottom-right on every page while the job keeps streaming.
**Language / Size:** TSX / 3864 bytes

## Exports
- `JobStreamMiniPlayer()` (named component, no props).

## Imports (Internal / External)
- Internal: `useJobStream` from `../../contexts/JobStreamContext`; `DockBoard` from `../../contexts/JobDockContext`.
- External: icons `Maximize2, X, Terminal, Loader2` (lucide-react).

## Props
None.

## State / Refs / Context consumed
- Context: `useJobStream()` → `isMinimized, isRunning, isCancelling, title, progress, summary, logs, restore, close, requestCancel`.

## Hooks & Effects (deps, purpose)
None.

## Functions & handlers
- Maximize/restore button → `restore()`. Close button (`!isRunning`) → `close()`. "Stop" (running) → `requestCancel()` (disabled while cancelling).

## Rendered UI
- Returns `null` unless `isMinimized`.
- Wrapped in `<DockBoard id="job-stream" order={1}>`; card with header (Terminal icon, `title`, restore, close-when-not-running), status text, progress bar, last log message, and a Stop button while running.
- `pct`: 100 if cancelling, else `round(current/total*100)`, else 5 (running) / 100.
- `done = summary?.deleted ?? summary?.productsDeleted ?? 0`; `errorCount = summary?.errors?.length ?? 0`.
- `statusText`: running → "Stopping…" / "{current} of {total}" / "Starting…"; else "Stopped · {done} done" or "Done · {done} processed".
- `barColor`: amber if cancelling/cancelled/errors, else primary; pulses while cancelling.

## Important logic & design patterns
- Complements `JobStreamDialog`: same context, shown only in the minimized state; `restore()` re-opens the dialog.
- `DockBoard order={1}` positions it above the changelog-gen mini-player (`order={2}`) so the two never overlap.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- Consumes `JobStreamContext` and `JobDockContext`. A global surface mounted in App.tsx; part of the job/mini-player system.
