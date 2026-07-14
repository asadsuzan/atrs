# `client/src/contexts/ThemeProvider.tsx`
**Purpose:** Theme + dark-mode provider. Applies a color theme class and light/dark mode to `<html>`, persists both to localStorage, and supports an "auto dark" mode that follows the OS `prefers-color-scheme`.
**Language / Size:** TSX / 3677 bytes

## Exports (Provider, hook, types, functions)
- `ThemeProvider({ children, defaultTheme = 'todoist', defaultDarkMode = false })` — provider.
- `useTheme()` — hook returning `ThemeProviderState`; throws `'useTheme must be used within a ThemeProvider'`.
- `Theme`, `ThemeProviderProps`, `ThemeProviderState` — types (internal, not exported).

## Imports (Internal / External)
Internal: none.
External: `react` (`createContext`, `useContext`, `useEffect`, `useState`).

## Context shape (the value object)
```ts
type Theme = 'todoist'|'moonstone'|'tangerine'|'kale'|'blueberry'|'lavender'|'raspberry';
type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
  isAutoDark: boolean;
  setIsAutoDark: (isAuto: boolean) => void;
};
```
Default context value: theme `'todoist'`, `isDark`/`isAutoDark` `false`, setters no-op.

## State managed & how it's updated
- `theme: Theme` (lazy init from `localStorage['vite-ui-theme']` or `defaultTheme`) — set via `setTheme` (also writes localStorage).
- `isDark: boolean` (lazy init from `localStorage['vite-ui-dark-mode']`, else `defaultDarkMode`) — set via `setIsDark`.
- `isAutoDark: boolean` (lazy init from `localStorage['vite-ui-auto-dark']`, else `false`) — set via `setIsAutoDark`.
- localStorage keys: `vite-ui-theme`, `vite-ui-dark-mode`, `vite-ui-auto-dark`.

## Hooks & Effects (deps, purpose, WHY)
- `useEffect([theme])` — removes all `theme-*` classes from `<html>` and adds `theme-${theme}`.
- `useEffect([isDark, isAutoDark])` — computes `shouldBeDark`: if `isAutoDark`, uses `matchMedia('(prefers-color-scheme: dark)').matches`, else `isDark`; toggles the `dark` class on `<html>`.
- `useEffect([isAutoDark])` — when auto is on, subscribes to `matchMedia` `change` and toggles `dark` live; cleans up the listener. WHY: keep the app in sync with OS theme switches while auto mode is active.

## Functions (purpose, algorithm, side effects)
- `setTheme(newTheme)` — set state + persist.
- `setIsDark(dark)` — set state + persist; if `isAutoDark` was on, turns auto off (state + persist) since a manual choice overrides auto.
- `setIsAutoDark(auto)` — set state + persist.

## Consumed by
`components/ui/sonner.tsx`, `pages/Settings.tsx`. (Provider mounted at app root — not exhaustively listed.)

## Important logic & design patterns
- Two independent axes: named theme (color palette classes) and dark mode.
- "Auto dark" precedence: enabling manual dark/light disables auto; auto mode subscribes to OS changes.
- All state initialized lazily from localStorage to avoid a flash of default theme.
