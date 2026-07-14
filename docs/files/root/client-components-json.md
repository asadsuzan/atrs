# `client/components.json`

Source: `client/components.json`

## Purpose
shadcn/ui configuration — controls how the shadcn CLI generates/places UI components and resolves aliases.

## Fields
| Field | Value | Meaning |
|-------|-------|---------|
| `$schema` | `https://ui.shadcn.com/schema.json` | Schema. |
| `style` | `new-york` | shadcn style preset. |
| `rsc` | `false` | Not React Server Components. |
| `tsx` | `true` | Generate `.tsx`. |
| `tailwind.config` | `tailwind.config.js` | Tailwind config path. |
| `tailwind.css` | `src/index.css` | Global CSS entry. |
| `tailwind.baseColor` | `slate` | Base palette. |
| `tailwind.cssVariables` | `true` | Use CSS variables for theming. |
| `tailwind.prefix` | `""` | No class prefix. |
| `aliases.components` | `@/components` | |
| `aliases.utils` | `@/lib/utils` | |
| `aliases.ui` | `@/components/ui` | |
| `aliases.lib` | `@/lib` | |
| `aliases.hooks` | `@/hooks` | |
