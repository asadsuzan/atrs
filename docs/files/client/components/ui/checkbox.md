# `client/src/components/ui/checkbox.tsx`
**Purpose:** shadcn/ui checkbox wrapping Radix Checkbox with a lucide check indicator.
**Language / Size:** TSX / 1158 bytes

## Exports
- `Checkbox` (`React.forwardRef`, `displayName` from `CheckboxPrimitive.Root`).

## Radix primitive wrapped
- `@radix-ui/react-checkbox` (`CheckboxPrimitive.Root` + `.Indicator`).

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: react, `@radix-ui/react-checkbox`, lucide-react (`Check`).

## Behavior / Rendering
- `h-4 w-4` bordered box; `data-[state=checked]` fills with primary color and shows the `Check` icon via `CheckboxPrimitive.Indicator`. Focus ring + disabled styles included.

## Relationships
- No contexts. Standard form control; used in tables (selection) and forms.
