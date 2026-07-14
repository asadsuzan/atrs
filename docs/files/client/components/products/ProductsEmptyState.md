# `client/src/components/products/ProductsEmptyState.tsx`
**Purpose:** Friendly, animated onboarding empty-state shown when the products table has no rows; offers "Add your first product" and "Import from WordPress.org" actions.
**Language / Size:** TypeScript(React) / 2947 bytes

## Exports
- `ProductsEmptyState({ onAdd, onImport })` (named component).

## Props
- `onAdd: () => void` — start the add-product flow.
- `onImport: () => void` — start the WP.org import flow.

## State / Hooks
- None; uses `framer-motion` for looping animations only.

## Behavior / Rendering
- Centered card with an animated `PackageOpen` icon (floating y-bounce, pulsing blurred halo, sparkle rotate/scale — all `repeat: Infinity`), a heading, explanatory copy, and two buttons (primary Add, outline Import) that fade/slide in with staggered delays.

## Relationships
- Buttons delegate to parent handlers that typically open `AddProductDialog` / the WP.org import. Rendered by the products page when the list is empty.

## Edge cases & known limitations
- Purely presentational; the infinite animations are decorative (no reduced-motion handling here).
