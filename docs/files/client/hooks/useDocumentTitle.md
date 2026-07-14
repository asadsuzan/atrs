# `client/src/hooks/useDocumentTitle.ts`
**Purpose:** Imperatively set the browser tab title for pages whose title depends on loaded data (e.g. a product name). Formats through the shared brand helper so titles read `"<title> · ATRS"`.
**Language / Size:** TypeScript (React) / 449 bytes

## Exports
- `useDocumentTitle(title?: string | null): void` — named export.

## API / Signature
- Param: `title?: string | null` — the raw (unbranded) title. Pass `null`/`undefined` while data is still loading; that yields just `"ATRS"`.
- Returns: `void`.

## Imports (Internal / External)
Internal: `formatTitle` from `../lib/pageTitle`.
External: `react` (`useEffect`).

## Behavior / Implementation
- `useEffect([title])`: sets `document.title = formatTitle(title)`. Re-runs whenever `title` changes. No cleanup (does not restore the previous title on unmount).

## Data structures / Types / Constants
None; delegates formatting to `formatTitle` (which appends `· ATRS` or returns the bare brand for falsy input).

## Relationships
- Used by entity/dynamic-route pages (product detail, public changelog/issue pages, explore) — these are the routes `lib/pageTitle.titleForPath` classifies as `PAGE_OWNED` and deliberately leaves for the page to title itself.
- Complements the centralized `titleForPath` used for static routes.

## Edge cases & known limitations
- No cleanup: the last set title persists after unmount until the next setter runs (the central route-title effect normally overwrites it on navigation).
- Side-effects the global `document.title`; SSR-unsafe if run without a DOM (client-only app).
