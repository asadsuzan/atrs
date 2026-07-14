# `client/src/components/ui/select.tsx`
**Purpose:** shadcn/ui select wrapping Radix Select — trigger, portaled scrollable content, items with check indicators, labels, separators, and scroll buttons.
**Language / Size:** TSX / 5972 bytes

## Exports
`Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`.

## Radix primitive wrapped
- `@radix-ui/react-select` (`SelectPrimitive`).

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: react, `@radix-ui/react-select`, lucide-react (`Check, ChevronDown, ChevronUp`).

## Behavior / Rendering
- `Select`/`Group`/`Value` — direct re-exports.
- `SelectTrigger` — `h-9 w-full` bordered row with a trailing `ChevronDown`; `data-[placeholder]` muted, focus ring, `[&>span]:line-clamp-1`.
- `SelectContent` — portaled, animated, `max-h-[--radix-select-content-available-height]`; default `position="popper"` adds directional translate offsets; wraps `SelectScrollUpButton`, a `Viewport` (popper sizing to trigger width), and `SelectScrollDownButton`.
- `SelectItem` — row with a right-aligned `Check` indicator via `ItemIndicator`; focus/disabled styles.
- `SelectLabel` (semibold heading), `SelectSeparator` (hairline), scroll buttons (chevrons).

## Relationships
- No contexts. Used by `Pagination` (rows-per-page) and filters/forms throughout.
