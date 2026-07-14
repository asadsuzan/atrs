# `client/src/hooks/useLocalStorage.ts`
**Purpose:** `useState`-compatible hook that mirrors a piece of state to `localStorage`, so a value survives reloads. Classic lazy-init + persist-on-set pattern.
**Language / Size:** TypeScript (React) / 1106 bytes

## Exports
- `useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void]` — named export.

## API / Signature
- Params: `key: string` (localStorage key), `initialValue: T` (fallback when nothing stored / on error).
- Returns: a `[storedValue, setValue]` tuple mirroring `useState`. `setValue` accepts either a value or an updater function `(val: T) => T`.

## Imports (Internal / External)
Internal: none.
External: `react` (`useState`).

## Behavior / Implementation
- **Init (lazy)** — `useState(() => …)` runs once: `window.localStorage.getItem(key)`; if present, `JSON.parse` it, else return `initialValue`. Any error is `console.error`-logged and falls back to `initialValue`.
- **Setter** — `setValue`: resolves an updater form via `value instanceof Function ? value(storedValue) : value`, calls `setStoredValue`, then `window.localStorage.setItem(key, JSON.stringify(valueToStore))`. Errors are `console.error`-logged (state still updates in memory before a write can throw).

## Data structures / Types / Constants
Generic `T`; values persisted as JSON. No module constants.

## Relationships
Generic utility hook for any component needing persisted local state. Distinct from `services/api.ts` token helpers and the `sound`/`tour` modules, which use `localStorage` directly with fixed keys.

## Edge cases & known limitations
- The updater closes over `storedValue` from render scope (not a functional `setState` for the storage write path), so rapid successive calls in one tick can compute from a stale value.
- No cross-tab `storage`-event sync; other tabs won't see updates.
- Reads `window.localStorage` directly — assumes a browser environment.
- Corrupt/non-JSON stored data falls back to `initialValue` (logged).
