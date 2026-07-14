# `client/src/components/tools/FramerExportBoard.tsx`
**Purpose:** Global, route-independent job board for Image Framer downloads. Rendered once at the app root (in the bottom dock) so the export queue keeps running and stays visible across navigation; minimizes to a compact progress pill.
**Language / Size:** TypeScript(React) / 6035 bytes

## Exports
- `FramerExportBoard()` (named component, no props).
- `JobRow` is module-private.

## State / Refs / Context consumed
- `useFramerExport()` → `jobs, phase, isMinimized, isRunning, cancel, dismiss, minimize, restore`.
- `KIND_META, type DownloadJob, type DownloadPhase` from `FramerExportContext`.
- Wrapped in `DockBoard` (`id="framer-export"`, `order={2}`).

## Behavior / Rendering
- `PHASE_LABEL` maps phase → label (idle/processing/packaging/downloading/done/cancelled/error).
- Returns `null` when there are no jobs.
- `active` = phase is processing/packaging/downloading; `done` = count of jobs with `status==='done'`. `StatusIcon` = spinner (active) / green check (done) / destructive alert (else).
- Minimized: a pill with the status icon, phase label, `done/total`, an overall progress mini-bar (when active), and a restore chevron.
- Expanded: header (status icon, phase label, `done/total`, Minimize, and Cancel-or-Dismiss depending on `isRunning`) + a scrollable list of `JobRow`s.
- `JobRow`: media thumbnail (video/img by `job.kind`), kind icon/label + name, a per-job progress bar while `rendering` (else Queued/Ready/Failed text), and a right-side status indicator (percent / check / alert / muted spinner).

## Relationships
- Consumes `FramerExportContext` (queue state/actions) and `JobDockContext` (docking). Fed by `ImageFramer` (`startExport`). Sibling of `WpImportMiniPlayer` in the dock.

## Edge cases & known limitations
- Purely a view over the context; all rendering/encoding/packaging happens in the provider/worker.
- Hidden entirely when the queue is empty; the X button cancels while running, otherwise dismisses.
