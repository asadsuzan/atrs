# `client/src/contexts/ChangelogGenContext.tsx`
**Purpose:** Drives the Git Changelog Generator's streaming pipeline from the app root so generation keeps running (and stays visible via a docked mini-player) after the user navigates away from the generator page. Mirrors the WP-import / image-framer job patterns.
**Language / Size:** TSX / 4891 bytes

## Exports (Provider, hook, types, functions)
- `useChangelogGen()` — hook returning `ChangelogGenContextValue`; throws `'useChangelogGen must be used within ChangelogGenProvider'`.
- `ChangelogGenProvider({ children }: { children: ReactNode })` — provider.
- `ChangelogGenContextValue`, `StartMeta` — interfaces (internal).

## Imports (Internal / External)
Internal:
- `generateChangelog`, `type GenerateInput`, `type ProgressEvent`, `type GenerationResult` from `../services/changelogGen`
- `cancelJob` from `../services/jobStream`
- `playSound` from `@/lib/sound`

External:
- `react` (`createContext`, `useContext`, `useRef`, `useState`, `type ReactNode`)
- `sonner` (`toast`)

## Context shape (the value object)
```ts
interface ChangelogGenContextValue {
  active: boolean;    // true once a run has started and not reset — drives the mini-player
  running: boolean;   // true while streaming
  logs: ProgressEvent[];
  currentStep: string;
  progress: { current: number; total: number } | null;
  result: GenerationResult | null;
  error: string | null;
  productName: string;
  start: (input: GenerateInput, meta: StartMeta) => void;   // StartMeta = { productName: string }
  cancel: () => void;
  reset: () => void;
}
```

## State managed & how it's updated
- `active` (init `false`) — set true on `start`, false on `reset`.
- `running` (init `false`) — true on `start`; false on complete/error/cancel.
- `logs: ProgressEvent[]` (init `[]`) — appended per `onProgress`; cleared on start/reset.
- `currentStep: string` (init `''`) — set to `evt.step` per progress.
- `progress` (init `null`) — set `{current: evt.itemIndex, total: evt.totalItems}` when both present.
- `result: GenerationResult | null` (init `null`) — set on complete.
- `error: string | null` (init `null`) — set on error.
- `productName: string` (init `''`) — set from `meta.productName` on start.
- Refs: `abortRef: AbortController | null`, `sessionIdRef: string | null` (for server-side cancel).

## Hooks & Effects (deps, purpose, WHY)
No `useEffect`. Uses `useRef` to hold the `AbortController` and streaming session id across renders without triggering re-renders. State reset is done imperatively in `start`/`reset`.

## Functions (purpose, algorithm, side effects)
- `start(input, meta)` — resets all run state, sets `active`/`running` true, creates an `AbortController`, calls `generateChangelog(input, callbacks, signal)`:
  - `onSession(id)` → store `sessionIdRef`.
  - `onProgress(evt)` → append log, set step, set progress if item counts present.
  - `onComplete(res)` → set result, `running=false`, clear session, `playSound('success')`; toast: if `res.stats.reviewEntriesCreated > 0` shows a "sent to the review queue" success toast (8s, pluralized), else generic success.
  - `onError(msg)` → set error, `running=false`, clear session, `playSound('error')`, `toast.error`.
  - `.catch` — ignores `AbortError`; otherwise sets error, stops running, `playSound('error')`.
- `cancel()` — if `sessionIdRef` set, calls `cancelJob(sessionId)` (server-side); aborts the local controller, clears refs, `running=false`, `toast.info('Generation cancelled')`.
- `reset()` — aborts controller, clears refs and all state back to idle.

## Consumed by
`components/jobs/ChangelogGenMiniPlayer.tsx`, `pages/ChangelogGenerator.tsx`.

## Important logic & design patterns
- Dual cancellation: server-side (`cancelJob(sessionId)`) plus local `AbortController.abort()` — needed because streaming jobs may span serverless instances.
- `active` vs `running` separation lets the mini-player stay mounted after completion until explicitly `reset`.
