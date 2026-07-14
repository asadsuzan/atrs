# `client/src/contexts/AddProductContext.tsx`
**Purpose:** App-level provider that owns the multi-step "Add Product" dialog and the "you need a product first" prompt, so any surface (Products page, Activities, sidebar empty states) can trigger the identical add-product flow.
**Language / Size:** TSX / 2607 bytes

## Exports (Provider, hook, types, functions)
- `useAddProduct()` — hook returning `AddProductContextValue`; throws `'useAddProduct must be used within AddProductProvider'` if used outside the provider.
- `AddProductProvider({ children }: { children: ReactNode })` — provider component.
- `AddProductContextValue` — interface (not exported; declared internally).

## Imports (Internal / External)
Internal:
- `createProduct` from `../services/products`
- `useWpImport` from `./WpImportContext`
- `AddProductDialog` from `../components/products/AddProductDialog`
- `NeedProductFirstDialog` from `../components/products/NeedProductFirstDialog`
- `playSound` from `@/lib/sound`

External:
- `react` (`createContext`, `useContext`, `useState`, `type ReactNode`)
- `@tanstack/react-query` (`useMutation`, `useQueryClient`)
- `sonner` (`toast`)

## Context shape (the value object)
```ts
interface AddProductContextValue {
  openAddProduct: () => void;      // opens the category chooser → form / WP.org import flow
  openAddProductFirst: () => void; // opens the "you need a product first" prompt
}
```

## State managed & how it's updated
- `chooserOpen: boolean` (`useState`, init `false`) — controls `AddProductDialog` open state. Set `true` by `openAddProduct`; set `false` on mutation success and via `onOpenChange`.
- `needFirstOpen: boolean` (`useState`, init `false`) — controls `NeedProductFirstDialog`. Set `true` by `openAddProductFirst`; set `false` by `openAddProduct` and via `onOpenChange`.
- `createMutation` — `useMutation` wrapping `createProduct`.

## Hooks & Effects (deps, purpose, WHY)
- `useQueryClient()` — to invalidate the `['products']` query after create so lists refresh.
- `useWpImport()` — pulls `open` (aliased `openWpImport`) to hand off the WP.org import flow from the chooser dialog.
- No `useEffect`.

## Functions (purpose, algorithm, side effects)
- `createMutation` (`mutationFn: createProduct`):
  - `onSuccess`: `playSound('success')`, `toast.success('Product created successfully')`, invalidate `['products']`, `setChooserOpen(false)`.
  - `onError`: `playSound('error')`, `toast.error('Failed to create product')`.
- `openAddProduct = () => { setNeedFirstOpen(false); setChooserOpen(true); }` — closes the "first" prompt and opens the chooser.
- `openAddProductFirst = () => setNeedFirstOpen(true)`.
- The provider renders children plus `AddProductDialog` (wired `onImport={openWpImport}`, `onCreate={(data) => createMutation.mutate(data)}`) and `NeedProductFirstDialog` (wired `onAddProduct={openAddProduct}`).

## Consumed by
`useAddProduct`: `components/layout/SidebarNav.tsx`, `pages/Activities.tsx`, `pages/Products.tsx`.

## Important logic & design patterns
- Provider-owned dialogs mounted alongside children so a single flow is reachable from many entry points.
- `onCreate` receives `data: any` (untyped) passed straight to the mutation.
- Bridges to `WpImportContext` for the WordPress.org import branch.
