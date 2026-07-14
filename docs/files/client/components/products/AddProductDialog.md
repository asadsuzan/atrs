# `client/src/components/products/AddProductDialog.tsx`
**Purpose:** A multi-step "Add a product" chooser dialog: pick product kind (WordPress/CMS vs Standalone), then (for WP) choose Import-from-WP.org vs Add-manually, then render the appropriate `ProductForm`.
**Language / Size:** TypeScript(React) / 4886 bytes

## Exports
- `AddProductDialog({ open, onOpenChange, onCreate, onImport })` (named component).
- `ChoiceCard` is module-private (a local option-card component).

## Props
- `open: boolean`, `onOpenChange: (open) => void` — controlled visibility.
- `onCreate: (data: any) => void` — called with the ProductForm submission.
- `onImport: () => void` — opens the existing WP.org import flow (dialog closes first).

## State / Hooks
- `step: 'type' | 'wp-method' | 'form'` and `variant: ProductFormVariant` (from `./ProductForm`).
- `useEffect([open])`: on open, resets to `step='type'`, `variant='wp'`.

## Behavior / Rendering
- `titles` map per step; `DialogTitle` includes a back-arrow button when not on the `type` step. `back()` navigates step → step (form → wp-method for wp, form → type for standalone).
- Step `type`: two `ChoiceCard`s — "WordPress / CMS based" (→ wp-method) and "Standalone" (→ form with variant standalone).
- Step `wp-method`: "Import from WordPress.org" (`goImport`: closes dialog then `onImport()`) and "Add manually" (→ form, variant wp).
- Step `form`: renders `<ProductForm variant={variant} onSubmit={onCreate} />`.

## Relationships
- Wraps `ProductForm` and delegates the import path to a parent-provided `onImport` (which opens `WpOrgImportDialog`/`WpImportContext`). Used from the products page and `ProductsEmptyState`.

## Edge cases & known limitations
- The dialog always restarts at the type chooser on open (no memory of last choice).
- `onCreate` receives `ProductForm`'s validated values (typed `any` here).
