# `client/src/components/ui/table.tsx`
**Purpose:** shadcn/ui table primitives — styled `<table>` and section/row/cell wrappers.
**Language / Size:** TSX / 2992 bytes

## Exports
`Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` — all `React.forwardRef` with display names.

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: react.

## Behavior / Rendering
- `Table` — wraps a `<table class="w-full caption-bottom text-sm">` in a `relative w-full overflow-auto` div (horizontal scroll).
- `TableHeader` — `thead` with `[&_tr]:border-b`.
- `TableBody` — `tbody` with `[&_tr:last-child]:border-0`.
- `TableFooter` — `tfoot` with `border-t bg-muted/50 font-medium`.
- `TableRow` — `tr` with bottom border, hover `bg-muted/50`, `data-[state=selected]` styling.
- `TableHead` — `th` (`h-10 text-left font-medium text-muted-foreground`, checkbox spacing helpers).
- `TableCell` — `td` (`p-2 align-middle`, checkbox spacing helpers).
- `TableCaption` — muted caption.

## Relationships
- No contexts. Foundational table primitive for data tables across the app.
