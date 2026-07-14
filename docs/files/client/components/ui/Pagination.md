# `client/src/components/ui/Pagination.tsx`
**Purpose:** Reusable table pagination: rows-per-page selector, first/prev/next/last buttons, numbered page jump buttons with ellipses, an item count, and a "go to page" input.
**Language / Size:** TSX / 4803 bytes

## Exports
- `Pagination(props: PaginationProps)` (named component).

## Props (`PaginationProps`)
- `page: number` — current 1-based page.
- `totalPages: number`.
- `onPageChange: (page: number) => void`.
- `limit?: number`, `onLimitChange?: (limit: number) => void` — both required to show the rows-per-page selector.
- `limitOptions?: number[]` (default `[10, 25, 50, 100]`).
- `total?: number` — shows "N item(s)" when a number.
- `className?: string`.

## State / Refs / Context consumed
- `jump` — string bound to the go-to-page input.

## Imports (Internal / External)
- Internal: `Button`, `Input`, `Select*` (`@/components/ui/*`).
- External: lucide-react (`ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight`); react (`useState`).

## Behavior / Rendering
- `pageCount = max(1, totalPages)`; `clamp(p)` bounds to `[1, pageCount]`; `go(p)` clamps then calls `onPageChange`.
- `submitJump` parses `jump` (base 10), goes if numeric, then clears the field.
- Left cluster: optional rows-per-page `Select` (shown only when both `onLimitChange` and `limit !== undefined`) and optional item count with plural handling.
- Right cluster: first/prev (disabled when `page <= 1`), the numbered buttons from `getPageList`, next/last (disabled when `page >= pageCount`), and a numeric-only jump input (strips non-digits) with a "Go" button (disabled when empty). Enter in the input submits.
- Active page button uses `variant="default"` and `aria-current="page"`; others `variant="outline"`.

## Data structures / Types / Constants
- `getPageList(current, total): (number | 'ellipsis')[]` — for `total <= 7` returns all pages; otherwise `[1, …, current-1..current+1, …, total]` inserting `'ellipsis'` sentinels where gaps exist.

## Relationships
- No contexts. Wraps `Button`/`Input`/`Select`; used by list/table pages (Products, Activities, Audit Log, etc.).

## Edge cases & known limitations
- Jump input accepts any clamped number; out-of-range jumps snap to bounds.
- The selector is hidden unless both `limit` and `onLimitChange` are provided.
