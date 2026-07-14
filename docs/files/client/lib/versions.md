# `client/src/lib/versions.ts`
**Purpose:** Single source of truth for version ordering and status flagging. Normalizes the varied version shapes the API returns, orders them canonically, and computes the two flags rendered everywhere: `isUnreleased` and `isLatest` (newest released). Consumers derive from these so "Latest"/"Unreleased" mean the same thing app-wide.
**Language / Size:** TypeScript / 3592 bytes

## Exports
- `VersionStatus` — type `'released' | 'unreleased'`.
- `RawVersion` — interface (loose API shape).
- `DecoratedVersion` — interface (`RawVersion` + `id`, `isUnreleased`, `isLatest`).
- `compareVersionDesc(a: string, b: string): number` — newest-first label comparator.
- `decorateVersions(raw): DecoratedVersion[]` — normalize + order + flag one product's versions.
- `latestReleasedLabel(raw): string | undefined` — newest released label.
- `groupVersionsByProduct(raw): Record<string, DecoratedVersion[]>` — group + decorate per product.
- `LabelInfo` — interface `{ label, isUnreleased }`.
- `summarizeLabels(raw): Map<string, LabelInfo>` — union status by label across products.

## API / Signature
All functions accept `RawVersion[] | undefined | null` (treated as `[]`) except `compareVersionDesc(a, b)` which takes two label strings.

## Imports (Internal / External)
None.

## Behavior / Implementation
- **`compareVersionDesc`**: strips a leading `v`/`V` and trims, then `b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })` → descending, numeric-aware (e.g. `1.10` after `1.9`).
- **`decorateVersions`**: maps each raw version to a `DecoratedVersion` with `id = String(v._id ?? v.id ?? v.label)`, `isUnreleased = (status === 'unreleased')`, `isLatest = false`. Sorts unreleased-first, then by `compareVersionDesc(label)`. Then flags the first non-unreleased entry (`list.find(v => !v.isUnreleased)`) as `isLatest` — exactly one released version is latest.
- **`latestReleasedLabel`**: `decorateVersions(raw).find(v => v.isLatest)?.label`.
- **`groupVersionsByProduct`**: buckets by `String(v.productId?._id ?? v.productId ?? '')` (handles populated or plain id), then `decorateVersions` per bucket independently.
- **`summarizeLabels`**: builds a `Map<label, LabelInfo>`; a label is `isUnreleased` if *any* version carrying it is unreleased (union). Skips versions without a `label`.

## Data structures / Types / Constants
- `RawVersion`: `{ _id?, id?, label, status?, releasedAt?, productId?, author?, notes?, tags?, [key]: any }`.
- `DecoratedVersion`: adds `id: string`, `isUnreleased: boolean`, `isLatest: boolean`.
- `LabelInfo`: `{ label: string; isUnreleased: boolean }`.

## Relationships
- The core of the versioning single-source pattern (per MEMORY: `lib/versions` + `useVersions` + `VersionBadge`). Consumed by `hooks/useVersions` (`useProductVersions` uses `decorateVersions`; `useAllVersions` uses `groupVersionsByProduct` + `summarizeLabels`) and by version badges/selectors.
- `summarizeLabels` supports cross-product, label-keyed filters (e.g. Reports) that don't have per-product version objects.

## Edge cases & known limitations
- Ordering is by label string (numeric-aware), not by `releasedAt` date — a mis-labeled version sorts by its label.
- `isLatest` is assigned to the first released entry after sort; if all versions are unreleased, none is latest.
- `status` compared strictly to the literal `'unreleased'`; any other value (including unknown strings) is treated as released.
- Loose `RawVersion` typing (`[key]: any`) tolerates extra fields but offers no compile-time guarantees.
