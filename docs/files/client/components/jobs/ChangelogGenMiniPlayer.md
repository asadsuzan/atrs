# `client/src/components/jobs/ChangelogGenMiniPlayer.tsx`
**Purpose:** Floating, dockable picture-in-picture view of a running (or just-finished) changelog-generation pipeline, shown on every page except the generator itself so the pipeline stays visible while navigating.
**Language / Size:** TSX / 5391 bytes

## Exports
- `ChangelogGenMiniPlayer()` (named component, no props).

## Imports (Internal / External)
- Internal: `useChangelogGen` from `../../contexts/ChangelogGenContext`; `DockBoard` from `../../contexts/JobDockContext`.
- External: `useLocation, useNavigate` (react-router-dom); icons `Maximize2, X, GitBranch, Loader2, ClipboardList, AlertCircle` (lucide-react).

## Props
None.

## State / Refs / Context consumed
- Module constants: `GENERATOR_PATH = '/changelog-generator'`; `STEP_LABELS` map (git, classify, summarize, report, review).
- Context: `useChangelogGen()` → `active, running, logs, currentStep, progress, result, error, productName, cancel, reset`.

## Hooks & Effects (deps, purpose)
None (derives view values inline).

## Functions & handlers
- Maximize button → `navigate(GENERATOR_PATH)`.
- Close button (`!running`) → `reset`.
- "Stop" (running) → `cancel`. "Open" → `navigate(GENERATOR_PATH)`. "Review" (when `reviewCount > 0`) → `navigate('/review')`.

## Rendered UI
- Returns `null` if `!active` or already on the generator page.
- Wrapped in `<DockBoard id="changelog-gen" order={2}>`; card with header (GitBranch, "Changelog · {productName}", maximize, close-when-not-running), status text, a progress bar (`pct`), the last log message, and action buttons.
- `pct` = `round(progress.current/progress.total*100)` if progress, else 5 while running, else 100.
- `statusText`: running → step label (+ `current/total`); error → "Failed"; done → "Done · {n} to review" or "Done".
- `barColor`: red on error, primary while running, emerald when done.
- `reviewCount = result?.stats?.reviewEntriesCreated ?? 0`.

## Important logic & design patterns
- Route-aware visibility (hidden on the full generator page).
- Dockable via `DockBoard` (`order={2}`) so it stacks predictably with other mini-players.
- Post-run "Review" shortcut appears only when review entries were created.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- Consumes `ChangelogGenContext` and `JobDockContext`. A global surface mounted in App.tsx; part of the job/mini-player system alongside `JobStreamMiniPlayer`.
