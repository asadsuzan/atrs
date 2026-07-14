# `client/src/App.css`
**Purpose:** Leftover Vite/React starter-template stylesheet (demo landing markup). Not part of the ATRS app shell styling.
**Language / Size:** CSS / 2891 bytes

## Contents
Plain CSS (no Tailwind directives) styling the default Vite starter page elements:
- `.counter` — uses `var(--accent)`, `var(--accent-bg)`, `var(--accent-border)` (note: these are NOT the tokens defined in `index.css`; they are the starter template's own variables and are not defined here).
- `.hero`, `.hero .base/.framework/.vite` — the animated logo hero with 3D `transform: perspective(...) rotate...` rules.
- `#center`, `#next-steps` (+ `#docs`, `#spacer`), `#next-steps ul`/`a`/`.logo`/`.button-icon` — the starter "next steps" panel, using `var(--border)`, `var(--text-h)`, `var(--social-bg)`, `var(--shadow)`.
- `.ticks` — decorative left/right tick marks via `::before`/`::after`.
- Responsive tweaks at `max-width: 1024px`.

## Notes
- No import of `App.css` was found in `main.tsx` or `App.tsx` (only `index.css` is imported by `main.tsx`). This file appears to be an unused remnant of the `npm create vite` React+TS template.
- Distinct from `index.css`: this file does not define the ATRS design tokens, themes, `.glass`, or `.rich-content`.

## Relationships
- Not determinable from source that any current component imports this file; it targets starter-template markup, not ATRS pages.
