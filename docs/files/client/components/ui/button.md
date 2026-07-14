# `client/src/components/ui/button.tsx`
**Purpose:** shadcn/ui button — cva-driven variants/sizes, `asChild` slot support, forwarded ref.
**Language / Size:** TSX / 2066 bytes

## Exports
- `Button` (`React.forwardRef<HTMLButtonElement, ButtonProps>`, `displayName = 'Button'`).
- `buttonVariants` (cva config).
- `interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }`.

## Variants (cva)
- Base: `inline-flex items-center justify-center gap-2 ... rounded-md text-sm font-medium transition-all active:scale-[0.97]`, focus ring, disabled opacity, `[&_svg]:size-4` icon sizing.
- `variant`: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`.
- `size`: `default` (`h-9 px-4`), `sm` (`h-8 px-3 text-xs`), `lg` (`h-10 px-8`), `icon` (`h-9 w-9`).
- `defaultVariants`: `variant: 'default'`, `size: 'default'`.

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: react, `@radix-ui/react-slot` (`Slot`), `class-variance-authority`.

## Behavior / Rendering
- When `asChild`, renders Radix `Slot` (merges props onto the child element) instead of `<button>`, enabling links/other elements to adopt button styles.

## Relationships
- No contexts. `buttonVariants` is reused by `alert-dialog` (Action/Cancel) and other components needing button styling. Foundational primitive across the app.
