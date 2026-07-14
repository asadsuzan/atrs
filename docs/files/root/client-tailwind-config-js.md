# `client/tailwind.config.js`

Source: `client/tailwind.config.js`

## Purpose
Tailwind CSS configuration (ESM `export default`). Class-based dark mode, shadcn/ui HSL CSS-variable color system, custom shadows/animations.

## Fields
- `darkMode`: `["class"]` — dark mode toggled by `.dark` class (matches index.html bootstrap).
- `content`: `['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}']`
- `prefix`: `""`
- `theme.container`: centered, `padding: 2rem`, `screens."2xl": 1400px`.
- `theme.extend.colors`: HSL CSS-variable driven — `border`, `input`, `ring`, `background`, `foreground`, and DEFAULT/foreground pairs for `primary`, `secondary`, `destructive`, `muted`, `accent`, `popover`, `card` (all `hsl(var(--...))`).
- `theme.extend.fontFamily.sans`: system stack (`-apple-system`, `BlinkMacSystemFont`, SF Pro Text/Display, Segoe UI, Roboto, Helvetica, Arial, sans-serif).
- `theme.extend.borderRadius`: `xl/lg/md/sm` derived from `var(--radius)`.
- `theme.extend.boxShadow`: soft multi-layer shadows `sm`→`2xl` (comment: "macOS-like depth").
- `theme.extend.keyframes`: `accordion-down`, `accordion-up` (Radix accordion height).
- `theme.extend.animation`: `accordion-down` / `accordion-up` (0.2s ease-out).
- `plugins`: `[require("tailwindcss-animate")]`.

## Note
`content` globs include `./pages`, `./components`, `./app` (relative to `client/`) in addition to `./src`, though the primary source lives under `src`.
