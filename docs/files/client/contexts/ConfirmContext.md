# `client/src/contexts/ConfirmContext.tsx`
**Purpose:** Promise-based confirmation dialog. `confirm(options)` returns a `Promise<boolean>` that resolves `true`/`false` when the user confirms/cancels a shared `AlertDialog`, replacing native `window.confirm`.
**Language / Size:** TSX / 2576 bytes

## Exports (Provider, hook, types, functions)
- `ConfirmProvider` (arrow-function component) — provider.
- `useConfirm()` — hook returning `ConfirmContextType`; throws `'useConfirm must be used within a ConfirmProvider'`.
- `ConfirmOptions`, `ConfirmContextType` — interfaces (internal).

## Imports (Internal / External)
Internal:
- `AlertDialog` and subcomponents (`AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`) from `@/components/ui/alert-dialog`

External:
- `react` (`createContext`, `useContext`, `useState`, `useCallback`, `type ReactNode`)

## Context shape (the value object)
```ts
interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}
interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;   // default 'Continue'
  cancelText?: string;    // default 'Cancel'
}
```

## State managed & how it's updated
- `open: boolean` (init `false`) — dialog visibility.
- `options: ConfirmOptions` (init title/description empty, confirmText 'Continue', cancelText 'Cancel') — current dialog copy.
- `resolver: { resolve: (value: boolean) => void } | null` (init `null`) — stored promise resolver for the in-flight `confirm` call.

## Hooks & Effects (deps, purpose, WHY)
- `confirm = useCallback((opts) => new Promise<boolean>((resolve) => { … }), [])` — sets options (applying defaults), stores the resolver, opens the dialog. WHY: memoized so callers' effect deps stay stable.
- No `useEffect`.

## Functions (purpose, algorithm, side effects)
- `handleConfirm()` — `resolver?.resolve(true)`, `setOpen(false)`.
- `handleCancel()` — `resolver?.resolve(false)`, `setOpen(false)`.
- `AlertDialog.onOpenChange` — treats any close (`!next`) as cancel via `handleCancel`; otherwise re-opens.

## Consumed by
`components/issues/IssueManager.tsx`, `components/marketing/MarketingManager.tsx`, `components/versions/VersionManager.tsx`, `pages/Activities.tsx`, `pages/FeatureRequests.tsx`, `pages/ProductDetails.tsx`, `pages/Products.tsx`, `pages/Review.tsx`, `pages/Settings.tsx`, `pages/admin/Users.tsx`.

## Important logic & design patterns
- Classic "imperative dialog via Promise + stored resolver" pattern — lets callers `await confirm({...})` in event handlers.
- Only one confirmation can be in flight at a time (single `resolver` slot).
