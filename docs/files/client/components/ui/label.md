# `client/src/components/ui/label.tsx`
**Purpose:** shadcn/ui label wrapping Radix Label with cva base styles.
**Language / Size:** TSX / 710 bytes

## Exports
- `Label` (`React.forwardRef`, `displayName` from `LabelPrimitive.Root`).

## Radix primitive wrapped
- `@radix-ui/react-label` (`LabelPrimitive.Root`).

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: react, `@radix-ui/react-label`, `class-variance-authority` (`cva`, `VariantProps`).

## Variants (cva)
- Single base variant: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70` (no variant options defined).

## Relationships
- No contexts. Used by `form.tsx` (`FormLabel`) and directly in forms.
