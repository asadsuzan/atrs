# `client/index.html`

Source: `client/index.html`

## Purpose
Vite HTML entry point for the SPA. Mounts React at `#root` and runs a pre-paint theme bootstrap script to avoid FOUC.

## Head
- `charset UTF-8`, responsive `viewport`.
- Favicon + apple-touch-icon: `/favicon.svg`.
- `theme-color`: `#146ef5`.
- `description`: "ATRS — Automated Townhall Report System: product portfolio, changelogs, and release reporting."
- `title`: `ATRS`.

## Inline theme bootstrap script
Runs before first paint (comment: keys must match `contexts/ThemeProvider.tsx`):
- Reads `localStorage['vite-ui-theme']` (default `'todoist'`) → adds class `theme-<name>` to `<html>`.
- Reads `vite-ui-auto-dark` (`'true'`) and `vite-ui-dark-mode`; if auto-dark, follows `prefers-color-scheme: dark`, else uses stored value; adds `dark` class when dark.
- Wrapped in try/catch (no-op on failure).

## Body
- `<div id="root"></div>` — React mount point.
- `<script type="module" src="/src/main.tsx">` — app entry.
