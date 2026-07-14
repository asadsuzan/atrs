# `client/src/hooks/useVersions.ts`
**Purpose:** React Query hooks that expose the version single-source. They fetch versions (per-product or owner-wide) and run the raw API data through `lib/versions` helpers so every consumer gets the same canonical ordering, `isLatest`/`isUnreleased` flags, per-product grouping, and label summaries.
**Language / Size:** TypeScript (React) / 1521 bytes

## Exports
- `useProductVersions(productId: string | undefined | null)` — versions for one product.
- `useAllVersions()` — every version across the owner's products.

## API / Signature
- `useProductVersions(productId)` → the React Query result spread (`...query`) plus:
  - `versions: DecoratedVersion[]` — `decorateVersions(query.data)` (ordered + flagged).
- `useAllVersions()` → the React Query result spread (`...query`) plus:
  - `raw: any[]` — the raw list (or `[]`).
  - `byProduct: Record<string, DecoratedVersion[]>` — `groupVersionsByProduct(raw)`.
  - `labelInfo: Map<string, LabelInfo>` — `summarizeLabels(raw)` for cross-product label-keyed filters.

## Imports (Internal / External)
Internal: `getVersions`, `getAllVersions` from `../services/versions`; `decorateVersions`, `groupVersionsByProduct`, `summarizeLabels`, and types `DecoratedVersion`, `LabelInfo` from `../lib/versions`.
External: `react` (`useMemo`); `@tanstack/react-query` (`useQuery`).

## Behavior / Implementation
- `useProductVersions`: `useQuery` with key `['versions', productId]`, `queryFn: () => getVersions(productId)`, `enabled: !!productId` (skips when no id). Derived `versions` computed with `useMemo([query.data])` via `decorateVersions`.
- `useAllVersions`: `useQuery` with key `['allVersions']`, `queryFn: getAllVersions`. `raw`, `byProduct`, `labelInfo` each memoized off `query.data`/`raw`.
- **Cache-key alignment:** the `['versions', productId]` key deliberately mirrors the key used by `VersionManager`'s mutations, so its invalidations refresh these hooks.

## Data structures / Types / Constants
- `DecoratedVersion`, `LabelInfo` — imported from `lib/versions`. Query data typed loosely as `any[]` and normalized by the lib helpers.

## Relationships
- Part of the versioning single-source pattern (per MEMORY: `lib/versions` + `useVersions` + `VersionBadge`). Consumers should read ordering/flags from here rather than re-deriving from activity labels.
- Shares the `['versions', productId]` cache namespace with `VersionManager`.

## Edge cases & known limitations
- `enabled: !!productId` means no fetch for null/undefined/empty-string ids; `versions` is then `[]`.
- Data is typed as `any[]` (casts), so type-safety depends on the lib helpers' normalization.
- Ordering/flag semantics live entirely in `lib/versions`; these hooks only wire in fetching + memoization.
