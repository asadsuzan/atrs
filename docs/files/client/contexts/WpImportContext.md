# `client/src/contexts/WpImportContext.tsx`
**Purpose:** Holds all WordPress.org import state and drives the SSE import stream. Lives at the app root (above the router) so an in-flight import survives navigation — enabling the minimized "picture-in-picture" mini-player: the user can collapse the dialog, roam other pages, and the import keeps streaming.
**Language / Size:** TSX / 11661 bytes

## Exports
- `WpImportProvider({ children }: { children: ReactNode })` — provider component.
- `useWpImport()` — hook returning `WpImportContextValue`; throws `'useWpImport must be used within WpImportProvider'` if outside.
- `WpPlugin`, `LogLine`, `ImportMode` — exported types.
- `WpImportContextValue` — interface (internal, not exported).

## API / Signature (context value shape)
```ts
interface WpImportContextValue {
  // Window state
  isOpen: boolean; isMinimized: boolean;
  open(): void; close(): void; minimize(): void; restore(): void;
  // Lookup method
  mode: ImportMode; setMode(m: ImportMode): void;         // 'username' | 'slug'
  // Selection (username method)
  username: string; setUsername(v: string): void;
  plugins: WpPlugin[]; selected: Set<string>; fetched: boolean;
  previewLoading: boolean; fetchPlugins(): void;
  toggle(slug: string): void; toggleAll(): void;
  // Selection (slug method)
  slugInput: string; setSlugInput(v: string): void; fetchSlugPlugins(): void;
  // Import phase
  isImporting: boolean; isCancelling: boolean;
  logs: LogLine[]; progress: { current: number; total: number } | null;
  summary: ImportSummary | null;
  startImport(): void; requestCancel(): void;
  quickImport(opts: { username?: string; slugs: string[] }): Promise<void>;
}
```

## Imports (Internal / External)
Internal: `wpOrgPreview`, `wpOrgPreviewBySlug`, `importFromWpOrgStream`, `cancelImportSession`, and types `ImportProgress`, `ImportSummary` from `../services/products`; `playSound` from `@/lib/sound`.
External: `react` (`createContext`, `useContext`, `useRef`, `useState`, `ReactNode`); `@tanstack/react-query` (`useMutation`, `useQueryClient`); `sonner` (`toast`).

## Behavior / Implementation
- **Window state:** `isOpen`/`isMinimized` with `open` (open+un-minimize), `minimize` (minimize+close dialog), `restore` (un-minimize+open), `close` (abort + full reset).
- **Two lookup modes:** `mode` `'username'` (author catalogue) or `'slug'` (explicit slugs). `setMode` clears any preview from the other method.
- **Preview mutations (React Query):**
  - `previewMutation` → `wpOrgPreview(username.trim())`; on success sets `plugins`, pre-selects ALL slugs (new and existing — existing get updated), `fetched=true`, plays `success`/toasts info on empty; on error plays `error` + toast.
  - `slugPreviewMutation` → splits `slugInput` on `/[\s,]+/`, trims/filters, calls `wpOrgPreviewBySlug(slugs)`; same success/error handling.
  - `previewLoading` = either mutation `isPending`.
- **Editing invalidates preview:** `setUsername`/`setSlugInput` reset `fetched` and clear `plugins`.
- **Selection:** `toggle(slug)` add/remove from `selected` Set; `toggleAll` selects all or clears.
- **Import stream (`runImport(uname, slugList)`):**
  - **Overlap guard:** synchronous `importInFlightRef` latch prevents a second run racing the first (double-click / manual start during a running stream) which would insert duplicates — checked before `isImporting` can re-render.
  - Resets import state, creates an `AbortController` (`abortRef`), and calls `importFromWpOrgStream(uname.trim(), slugList, callbacks, controller.signal)`.
  - Callbacks: `onSession(id)` stores `sessionIdRef`; `onProgress(e)` updates `progress` when `pluginIndex`/`totalPlugins` present and pushes a timestamped `LogLine`; `onComplete(result)` sets `summary`, plays `error`/`success` by error count, toasts cancelled-with-rollback vs created/updated summary, and `invalidateQueries(['products'])`; `onError(message)` plays `error`, logs, toasts.
  - `catch`: ignores `AbortError` (user closed mid-stream); otherwise logs + toasts failure.
  - `finally`: clears importing/cancelling flags, `abortRef`, and the in-flight latch.
- **`startImport`:** `runImport(mode === 'username' ? username : '', Array.from(selected))` — username only passed in author mode.
- **`quickImport({ username?, slugs })`:** onboarding shortcut — returns early if no slugs; opens/un-minimizes the console, sets username, and awaits `runImport` (skips the manual select step).
- **`requestCancel`:** graceful cancel — if a `sessionId` is known, sets `isCancelling` and calls `cancelImportSession(sessionId)` (keeps the stream open so rollback progress streams in); if no session yet, hard-`abort()`s the controller. On cancel-request failure, toasts and clears `isCancelling`.
- **`close`:** `abortRef.current?.abort()` (server rolls back on disconnect) then full `resetAll()`.

## Data structures / Types / Constants
- `WpPlugin`: `{ slug, name, shortDescription, icon, category: 'plugin' | 'block', alreadyImported }`.
- `LogLine`: `{ type: ImportProgress['type']; message: string; slug?: string; timestamp: string }` (timestamp = `toLocaleTimeString([], { hour12: false })`).
- `ImportMode`: `'username' | 'slug'`.
- Refs: `abortRef` (AbortController), `sessionIdRef` (server session id), `importInFlightRef` (overlap latch).

## Relationships
- Consumes `services/products` streaming/import APIs (SSE) and `lib/sound` cues; uses React Query's client to invalidate `['products']` after imports.
- `useWpImport` is consumed by the import dialog UI, the minimized mini-player, and onboarding (`quickImport`).
- Provider is mounted above the router so state persists across navigation.

## Edge cases & known limitations
- Duplicate-import prevention relies on the synchronous `importInFlightRef` (client) plus server-side idempotency (unique constraint noted in the app changelog).
- Cancellation depends on the server having reported a session id; before that, only a hard abort is possible (relies on server rollback-on-disconnect).
- Fully closing during a stream aborts and rolls back on the server; the resulting `AbortError` is intentionally swallowed.
- Products query is invalidated even on rollback (created-then-rolled-back), to keep the list accurate either way.
