# `client/src/hooks/useDebouncedValue.ts`
**Purpose:** Generic debounce hook — returns a copy of a value that only updates after a quiet period, so a fast-changing input (e.g. a search box) can stay responsive while the debounced copy drives an expensive query.
**Language / Size:** TypeScript (React) / 577 bytes

## Exports
- `useDebouncedValue<T>(value: T, delay = 300): T` — named export.

## API / Signature
- Params: `value: T` (the live value to track), `delay = 300` (ms of inactivity before the debounced value updates).
- Returns: `T` — the debounced value.

## Imports (Internal / External)
Internal: none.
External: `react` (`useEffect`, `useState`).

## Behavior / Implementation
- Holds `debounced` in `useState<T>(value)`, initialized to the current value.
- `useEffect([value, delay])`: on every change of `value` (or `delay`), starts a `setTimeout(() => setDebounced(value), delay)`; the cleanup `clearTimeout(timer)` cancels the pending update if `value` changes again first. Net effect: the debounced value settles only after `delay` ms without a change.
- Returns `debounced`.

## Data structures / Types / Constants
Generic `T`; default `delay` of 300 ms. No constants.

## Relationships
Used across list/search UIs to throttle query-driving values (e.g. the Activity Timeline search filter). Purely local; no storage or network.

## Edge cases & known limitations
- Initial render returns the initial `value` immediately (no initial delay).
- Changing `delay` restarts the timer.
- Standard React timer-debounce pattern; if `value` is a new object reference each render, the effect re-fires every render (compare-by-reference).
