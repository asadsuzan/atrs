# `client/src/components/products/NeedProductFirstDialog.tsx`
**Purpose:** Small informational dialog shown when a user tries to add a changelog entry with no products yet; explains the dependency and routes them into the add-product flow.
**Language / Size:** TypeScript(React) / 1674 bytes

## Exports
- `NeedProductFirstDialog({ open, onOpenChange, onAddProduct })` (named component).

## Props
- `open: boolean`, `onOpenChange: (open) => void` — controlled visibility.
- `onAddProduct: () => void` — invoked (after closing this dialog) to start the add-product flow.

## State / Hooks
- None (pure presentational).

## Behavior / Rendering
- `Dialog` (`max-w-md`) with a centered `PackageOpen` icon, heading "You need a product first", explanatory copy, and a primary "Add a product" button that calls `onOpenChange(false)` then `onAddProduct()`.

## Relationships
- Typically paired with `AddProductDialog` — `onAddProduct` opens it. Rendered by the changelog/activity creation entry points.

## Edge cases & known limitations
- Purely a routing/UX gate; performs no data access.
