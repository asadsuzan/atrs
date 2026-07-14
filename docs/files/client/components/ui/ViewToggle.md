# `client/src/components/ui/ViewToggle.tsx`
**Purpose:** Segmented control to switch a list between a table and a card grid.
**Language / Size:** TSX / 1413 bytes

## Exports
- `ViewToggle({ value, onChange, className })` (named component).
- `type ViewMode = 'table' | 'grid'` (named type).

## Props
- `value: ViewMode` — current mode.
- `onChange: (v: ViewMode) => void`.
- `className?: string`.

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: lucide-react (`LayoutGrid, List`).

## Behavior / Rendering
- Renders two icon buttons (`List` → table, `LayoutGrid` → grid) inside a bordered pill container. The active option gets `bg-primary text-primary-foreground`; each button sets `aria-pressed`, `aria-label`, and `title`.

## Data structures / Types / Constants
- Local `options` array mapping each `ViewMode` to its icon and label.

## Relationships
- No contexts. Presentational; used by list pages that offer table/grid layouts (Products, Changelogs).

## Edge cases & known limitations
- Only two modes are supported; adding modes requires editing `options` and the `ViewMode` union.
