# `client/src/components/ui/badge.tsx`
**Purpose:** shadcn/ui badge — a small pill label with cva-driven variants.
**Language / Size:** TSX / 1248 bytes

## Exports
- `Badge({ className, variant, ...props })` — a `<div>` with `badgeVariants` applied.
- `badgeVariants` (cva config).
- `interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants>`.

## Variants (cva)
- Base: `inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold` + focus ring.
- `variant`: `default` (primary), `secondary`, `destructive`, `outline` (`text-foreground`, transparent bg).
- `defaultVariants`: `variant: 'default'`.

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: react, `class-variance-authority` (`cva`, `VariantProps`).

## Relationships
- No contexts. `badgeVariants` may be reused for badge-styled non-badge elements. Widely used for status/type labels.

## Edge cases & known limitations
- Renders a `<div>` (not interactive); focus-ring styles apply only if made focusable by the caller.
