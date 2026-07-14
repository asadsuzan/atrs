# `client/src/components/jobs/JobStreamDialog.tsx`
**Purpose:** Full modal dialog for a running bulk/cascade job: live progress bar, streaming color-coded console, and stop/close controls. Closing while running minimizes to a floating mini-player instead of killing the job.
**Language / Size:** TSX / 5241 bytes

## Exports
- `JobStreamDialog()` (named component, no props).

## Imports (Internal / External)
- Internal: `useJobStream, type JobLogLine` from `../../contexts/JobStreamContext`; UI `Dialog, DialogContent, DialogHeader, DialogTitle` (`@/components/ui/dialog`), `Button` (`@/components/ui/button`).
- External: `useEffect, useRef` (react); icons `Loader2, Terminal, Minus` (lucide-react).

## Props
None.

## State / Refs / Context consumed
- Module const: `LOG_STYLES` map keyed by `JobLogLine['type']` (info/success/warn/error) → color + icon glyph.
- Ref: `logEndRef` — sentinel div for auto-scroll.
- Context: `useJobStream()` → `isOpen, isRunning, isCancelling, title, logs, progress, summary, requestCancel, minimize, restore, close`.

## Hooks & Effects (deps, purpose)
- `useEffect([logs, isOpen])`: `logEndRef.current?.scrollIntoView({ behavior:'smooth', block:'end' })` — keeps the console pinned to the latest line.

## Functions & handlers
- `handleOpenChange(next)`: opening → `restore()`; closing → `minimize()` if running, else `close()`.
- Minimize button → `minimize()`. Stop button → `requestCancel()` (disabled while `isCancelling`). Close button → `close()`.

## Rendered UI
- `Dialog` (`max-w-2xl`, `max-h-[85vh]`): a minimize button (top-right), header ("Terminal" icon + `title`), progress bar, live console, and footer.
- Progress label: running → "Stopping…" / "Processing {current} of {total}…" / "Starting…"; else "Stopped" (`summary?.cancelled`) or "Finished". Percentage shown when `progress && !isCancelling`.
- Bar color: amber if cancelling/cancelled/errors, else primary; pulses while cancelling. Width: 100% when cancelling, else `current/total%`, else 5% (running) / 100%.
- Console: monospace on `bg-slate-950`; each line shows timestamp, type glyph, message; a "working…"/"stopping…" spinner row while running.
- `done = summary?.deleted ?? summary?.productsDeleted ?? 0`; `errorCount = summary?.errors?.length ?? 0`; footer shows "{done} done · {n} error(s)".

## Important logic & design patterns
- Minimize-on-close preserves a running job (hands off to `JobStreamMiniPlayer`).
- Generic summary field fallback (`deleted` vs `productsDeleted`) supports multiple job kinds.
- Auto-scroll via a bottom sentinel ref.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- Consumes `JobStreamContext`. A global surface mounted in App.tsx; paired with `JobStreamMiniPlayer` (minimized view).
