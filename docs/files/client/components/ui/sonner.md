# `client/src/components/ui/sonner.tsx`
**Purpose:** App-themed wrapper around the `sonner` `Toaster`, syncing toast theme with the app's ThemeProvider.
**Language / Size:** TSX / 961 bytes

## Exports
- `Toaster(props)` (named component). `type ToasterProps = React.ComponentProps<typeof Sonner>`.

## State / Refs / Context consumed
- Consumes `useTheme()` from `@/contexts/ThemeProvider` (`isDark`, `isAutoDark`).

## Imports (Internal / External)
- Internal: `useTheme` (`@/contexts/ThemeProvider`).
- External: `Toaster as Sonner` (sonner).

## Behavior / Rendering
- Computes `theme` = `'system'` when `isAutoDark`, else `'dark'`/`'light'` from `isDark`, and passes it to `<Sonner>`.
- Applies theme-aware `toastOptions.classNames` (toast/description/actionButton/cancelButton) using the app's design tokens via `group-[...]` selectors. Spreads through any extra `props`.

## Relationships
- Contexts used: ThemeProvider (`useTheme`). Rendered once near the app root; toasts are emitted app-wide via sonner's `toast()` (e.g. from `MediaUploader`).

## Edge cases & known limitations
- Theme correctness depends on `ThemeProvider` being an ancestor; `useTheme` would otherwise throw / return defaults per that provider's contract.
