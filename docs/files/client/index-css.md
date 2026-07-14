# `client/src/index.css`
**Purpose:** Global stylesheet. Loads Tailwind, defines the design-system CSS variables (light + `.dark` themes), the seven color themes, base element styling (fonts, mobile touches), custom scrollbars, rich-text content styles, and the `.glass` frosted-glass utility.
**Language / Size:** CSS / 8382 bytes

## Tailwind
`@tailwind base; @tailwind components; @tailwind utilities;` at the top. Uses `@layer base` and `@layer utilities`.

## CSS variables (design tokens)
Defined on `:root` (light) and overridden on `.dark`. All are HSL triplet values (consumed as `hsl(var(--x))`). Tokens:
`--background, --foreground, --card, --card-foreground, --popover, --popover-foreground, --primary, --primary-foreground, --secondary, --secondary-foreground, --muted, --muted-foreground, --accent, --accent-foreground, --destructive, --destructive-foreground, --border, --input, --ring` (`--ring: var(--primary)`), and `--radius: 0.75rem`.
- Light: cool off-white desktop (`--background: 210 20% 98%`) with pure-white cards. Comments cite a macOS-inspired look.
- `.dark`: deep low-chroma neutral (`--background: 224 14% 9%`) with slightly elevated cards.

## Color themes (override `--primary` / `--primary-foreground`)
Each has a light rule and a `.dark .theme-*` rule:
- `.theme-todoist` (Red — the app default, see `ThemeProvider defaultTheme="todoist"`)
- `.theme-moonstone` (Slate/Teal)
- `.theme-tangerine` (Orange)
- `.theme-kale` (Green)
- `.theme-blueberry` (Blue; dark variant uses a lighter blue)
- `.theme-lavender` (Purple)
- `.theme-raspberry` (Pink)

## Base layer
- `* { @apply border-border; }`.
- `html`: `-webkit-tap-highlight-color: transparent`, `-webkit-text-size-adjust: 100%`, `text-size-adjust: 100%`.
- `body`: `@apply bg-background text-foreground`; SF/system font stack; antialiasing; `letter-spacing: -0.011em`; `overscroll-behavior-y: none`; `overflow-x: hidden`.
- Mobile (`max-width: 767px`): pins editable controls (`input`(most types), `textarea`, `select`) to `font-size: 16px` to stop iOS zoom-on-focus.
- `.overflow-y-auto/.overflow-auto/.overflow-x-auto`: `-webkit-overflow-scrolling: touch`.
- Headings `h1–h4`: `letter-spacing: -0.021em`.
- `::selection`: `hsl(var(--primary) / 0.18)`.

## Utilities layer
- Thin neutral custom scrollbars: `scrollbar-width: thin`, `scrollbar-color`, and `::-webkit-scrollbar*` rules (8px). `.custom-scrollbar` variant is narrower (6px) and lighter — used e.g. for the activity feed.
- **`.rich-content`**: shared rich-text styles (editor + read-only) — `p, h3, h4, ul, ol, li, a, strong/b, blockquote, code, pre, pre code` — so authored formatting renders identically. `word-break: break-word; overflow-wrap: anywhere`. Links use `hsl(var(--primary))`; `code`/`pre` use `hsl(var(--muted))` backgrounds and a monospace stack.
- **`.glass`**: frosted-glass surface — `background-color: hsl(var(--card) / 0.72)` + `backdrop-filter: blur(20px) saturate(180%)` (and `-webkit-` prefix). `@supports not (...)` fallback sets a solid `hsl(var(--card))` where `backdrop-filter` is unsupported. This is the signature material used by the sidebar rail, mobile drawer, and top bars in `App.tsx`.

## Relationships
- Imported once by `main.tsx`. Tokens are consumed via Tailwind's `bg-background`, `text-foreground`, etc. (config maps utilities to these HSL vars) and directly via `hsl(var(--...))`. `ThemeProvider` toggles `.dark` and the `.theme-*` class.
