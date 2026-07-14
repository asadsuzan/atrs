# `client/src/contexts/JobStreamContext.tsx`
**Purpose:** Drives one streaming bulk/cascade job at a time (e.g. bulk-delete) via SSE, exposed through a minimizable live-console dialog + floating mini-player. Lives at the app root so a minimized job keeps streaming across navigation.
**Language / Size:** TSX / 5593 bytes

## Exports (Provider, hook, types, functions)
- `JobLogLine`, `JobRunConfig` — exported types.
- `useJobStream()` — hook; throws `'useJobStream must be used within JobStreamProvider'`.
- `JobStreamProvider({ children })` — provider.
- `JobStreamContextValue` — interface (internal).

## Imports (Internal / External)
Internal:
- `streamJob`, `cancelJob`, `type JobProgress`, `type JobSummary` from `../services/jobStream`
- `playSound` from `@/lib/sound`

External:
- `react` (`createContext`, `useContext`, `useRef`, `useState`, `type ReactNode`)
- `sonner` (`toast`)

## Context shape (the value object)
```ts
interface JobStreamContextValue {
  isOpen: boolean;
  isMinimized: boolean;
  isRunning: boolean;
  isCancelling: boolean;
  title: string;
  noun: string;
  logs: JobLogLine[];
  progress: { current: number; total: number } | null;
  summary: JobSummary | null;
  runJob: (config: JobRunConfig) => void;
  requestCancel: () => void;
  minimize: () => void;
  restore: () => void;
  close: () => void;
}
```
Supporting types:
```ts
type JobLogLine = { type: JobProgress['type']; message: string; label?: string; timestamp: string; };
interface JobRunConfig {
  title: string;                    // dialog/mini-player heading
  method?: 'POST' | 'DELETE';       // default 'POST'
  url: string;                      // relative to /api
  body?: any;
  noun?: string;                    // unit word for summaries, default 'item'
  onDone?: (summary: JobSummary) => void;
}
```

## State managed & how it's updated
- `isOpen`, `isMinimized`, `isRunning`, `isCancelling` — booleans (all init `false`).
- `title: string` (init `''`), `noun: string` (init `'item'`).
- `logs: JobLogLine[]` (init `[]`) — appended per progress with a local `HH:mm:ss` timestamp.
- `progress` (init `null`) — set from `itemIndex`/`totalItems`.
- `summary: JobSummary | null` (init `null`) — set on complete.
- Refs: `abortRef: AbortController`, `sessionIdRef: string | null`, `onDoneRef: JobRunConfig['onDone']` (holds the latest onDone callback outside render).

## Hooks & Effects (deps, purpose, WHY)
No `useEffect`. Uses `useRef` for the abort controller, streaming session id, and the `onDone` callback (so completion can invoke the caller's handler without stale closure/re-render churn).

## Functions (purpose, algorithm, side effects)
- `minimize()` — `isMinimized=true`, `isOpen=false`.
- `restore()` — `isMinimized=false`, `isOpen=true`.
- `close()` — aborts controller, clears refs, resets all state (fully dismisses the console).
- `runJob(config)` — resets state, opens console, stores `onDoneRef`, creates `AbortController`, then `await streamJob(method, url, body, callbacks, signal)`:
  - `onSession(id)` → store session id.
  - `onProgress(e)` → set progress if item counts present; push a log line.
  - `onComplete(result)` → set summary; `playSound(result.errors?.length ? 'error':'success')`; invoke `onDoneRef.current?.(result)`.
  - `onError(message)` → `playSound('error')`, push error log, `toast.error`.
  - `catch` — ignores `AbortError`; else plays error, logs, toasts "Operation failed".
  - `finally` — `isRunning=false`, `isCancelling=false`, clear abortRef.
- `requestCancel()` — if no session id yet, hard-abort the controller; else set `isCancelling`, `await cancelJob(sessionId)` (already-processed items are kept); on failure toast + reset cancelling flag.

## Consumed by
`components/jobs/JobStreamDialog.tsx`, `components/jobs/JobStreamMiniPlayer.tsx`, `pages/Activities.tsx`, `pages/MediaManager.tsx`, `pages/Products.tsx`, `pages/admin/Users.tsx`.

## Important logic & design patterns
- Generic single-job runner parameterized by `{url, method, body, onDone}` — reused across many bulk operations.
- Graceful server-side cancel (`cancelJob`) with a hard-abort fallback when the session id hasn't arrived, for multi-instance serverless reliability.
- `onDoneRef` decouples the caller's completion side effects (query invalidation, selection clearing) from provider state.
