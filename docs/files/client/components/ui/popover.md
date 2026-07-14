# `client/src/components/ui/popover.tsx`
**Purpose:** shadcn/ui popover wrapping Radix Popover — portaled, animated floating content.
**Language / Size:** TSX / 1038 bytes

## Exports
- `Popover` (alias of `PopoverPrimitive.Root`), `PopoverTrigger` (alias of `.Trigger`), `PopoverContent`.

## Radix primitive wrapped
- `@radix-ui/react-popover` (`PopoverPrimitive`).

## Props (`PopoverContent`)
- `React.ComponentProps<typeof PopoverPrimitive.Content>`; defaults `align = 'center'`, `sideOffset = 4`.

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: `@radix-ui/react-popover`.

## Behavior / Rendering
- `PopoverContent` renders inside `PopoverPrimitive.Portal` with `z-50 rounded-lg border bg-popover shadow-xl` plus open/close fade/zoom and side-slide animations.

## Relationships
- No contexts. Used by `DatePicker` and other floating UI (filters, menus).

## Edge cases & known limitations
- `PopoverContent` is a plain function component (not `forwardRef`); no ref is forwarded to the Radix content.
