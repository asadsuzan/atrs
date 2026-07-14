# `client/src/hooks/useFormDraft.ts`
**Purpose:** Browser-style autosave/restore drafts for `react-hook-form`. While the user types, form values are debounced-persisted to `localStorage`; on return the draft is silently re-filled and a "Draft restored" toast is shown. Caller clears the draft after a successful submit/cancel.
**Language / Size:** TypeScript (React) / 2970 bytes

## Exports
- `useFormDraft<T extends FieldValues>(form, options): { clearDraft: () => void }` — named export.
- `FormDraftOptions<T>` — interface (declared, not exported).

## API / Signature
- Params:
  - `form: UseFormReturn<T>` — the react-hook-form instance.
  - `options: FormDraftOptions<T>`:
    - `key: string | null` — unique storage key per logical form (e.g. `draft:product:new`, `draft:product:<id>`). `null` disables persistence.
    - `enabled?: boolean` (default `true`).
    - `debounceMs?: number` (default `500`) — autosave debounce.
    - `exclude?: (keyof T)[]` (default `[]`) — fields never persisted (large/sensitive values).
- Returns: `{ clearDraft: () => void }`.

## Imports (Internal / External)
Internal: none.
External: `react` (`useEffect`, `useRef`); `sonner` (`toast`); `react-hook-form` types (`UseFormReturn`, `FieldValues`, type-only).

## Behavior / Implementation
- **Restore (once)** — `useEffect([key, enabled])` guarded by `restoredRef`: reads `localStorage.getItem(key)`, `JSON.parse`s it, and if it's a non-empty object calls `form.reset({ ...form.getValues(), ...saved }, { keepDefaultValues: true })` — merging saved values over current defaults so absent fields keep their initial value — then shows `toast('Draft restored', …)`. Parse errors are swallowed (corrupt draft ignored). Runs only on first mount for a given key (`restoredRef` latch); deps intentionally exclude `form` (eslint-disable comment).
- **Autosave (debounced)** — `useEffect([key, enabled, debounceMs])`: subscribes via `form.watch(values => …)`; each change resets a `setTimeout(debounceMs)` that copies `values`, `delete`s each `exclude`d key, and `localStorage.setItem(key, JSON.stringify(data))`. Write errors (quota/private mode) are swallowed. Cleanup calls `sub.unsubscribe()` and clears the pending timer.
- **`clearDraft()`** — `localStorage.removeItem(key)` (no-op if `key` is null); errors swallowed.

## Data structures / Types / Constants
- `FormDraftOptions<T extends FieldValues>` as above. Storage value is `JSON.stringify` of the watched form values minus excluded fields. Storage keys are caller-supplied (convention: `draft:<entity>:<id|new>`).

## Relationships
- Depends on `react-hook-form` (`watch`, `reset`, `getValues`) and `sonner` toasts.
- Used by create/edit forms (e.g. product create/edit) to survive accidental navigation/reload.

## Edge cases & known limitations
- Restore fires once per mount per key; changing `key` at runtime re-runs restore for the new key.
- No cross-tab sync and no schema validation — a stale draft whose shape no longer matches the form is merged as-is (unknown keys may reach `form.reset`).
- `exclude` only filters top-level keys.
- Silent failure by design for both read and write errors.
