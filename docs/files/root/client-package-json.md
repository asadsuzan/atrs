# `client/package.json`

Source: `client/package.json`

## Purpose
Manifest for the `client` workspace: a React 19 + Vite + TypeScript SPA using Tailwind and shadcn/ui (Radix) components. `"type": "module"`, `"private": true`.

## Fields
| Field | Value |
|-------|-------|
| `name` | `client` |
| `version` | `0.0.0` |
| `type` | `module` |

## Scripts (exact commands)
| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Vite dev server. |
| `build` | `tsc -b && vite build` | Type-check (project refs build) then produce production bundle in `dist`. |
| `lint` | `eslint .` | Lint the workspace. |
| `preview` | `vite preview` | Serve built output locally. |

## Dependencies (runtime) — role
| Package | Version | Role |
|---------|---------|------|
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | `^6.3.1` / `^10.0.0` / `^3.2.2` | Drag-and-drop (sortable lists). |
| `@hookform/resolvers` | `^5.4.0` | Zod resolver bridge for react-hook-form. |
| `@radix-ui/react-alert-dialog`, `-checkbox`, `-dialog`, `-dropdown-menu`, `-label`, `-popover`, `-select`, `-slot` | various | Headless UI primitives (shadcn/ui base). |
| `@tanstack/react-query` | `^5.101.0` | Server-state data fetching/caching. |
| `axios` | `^1.17.0` | HTTP client. |
| `class-variance-authority` | `^0.7.1` | Variant-based className composition. |
| `clsx` | `^2.1.1` | Conditional className join. |
| `cmdk` | `^1.1.1` | Command palette component. |
| `date-fns` | `^4.4.0` | Date utilities. |
| `dompurify` | `^3.4.11` | HTML sanitization (markdown/user content). |
| `driver.js` | `^1.4.0` | Product tours / feature highlights. |
| `file-saver` | `^2.0.5` | Client-side file download. |
| `framer-motion` | `^12.40.0` | Animations. |
| `html2canvas` | `^1.4.1`, `html2canvas-pro` | DOM-to-canvas screenshotting (report/export). |
| `jspdf` | `^4.2.1` | PDF generation. |
| `jszip` | `^3.10.1` | ZIP archive creation (bulk export). |
| `lenis` | `^1.3.23` | Smooth scrolling. |
| `lucide-react` | `^1.17.0` | Icon set. |
| `pptxgenjs` | `^4.0.1` | PowerPoint (.pptx) generation. |
| `react`, `react-dom` | `^19.2.6` | UI runtime. |
| `react-hook-form` | `^7.77.0` | Forms. |
| `react-markdown` | `^10.1.0` | Markdown rendering. |
| `react-router-dom` | `^7.17.0` | Routing. |
| `recharts` | `^3.8.1` | Charts. |
| `sonner` | `^2.0.7` | Toast notifications. |
| `tailwind-merge` | `^3.6.0` | Merge/dedupe Tailwind classes. |
| `tailwindcss-animate` | `^1.0.7` | Tailwind animation utilities (used in tailwind.config). |
| `zod` | `^4.4.3` | Schema validation. |

## devDependencies — role
| Package | Version | Role |
|---------|---------|------|
| `@eslint/js` | `^10.0.1` | ESLint base config. |
| `@tailwindcss/postcss` | `^4.3.0` | Tailwind PostCSS integration. |
| `@types/file-saver`, `@types/node`, `@types/react`, `@types/react-dom` | various | Type definitions. |
| `@vitejs/plugin-react` | `^6.0.1` | React fast-refresh/JSX for Vite. |
| `autoprefixer` | `^10.5.0` | PostCSS autoprefixing. |
| `eslint` | `^10.3.0` | Linter. |
| `eslint-plugin-react-hooks` | `^7.1.1` | React hooks lint rules. |
| `eslint-plugin-react-refresh` | `^0.5.2` | Fast-refresh lint rules. |
| `globals` | `^17.6.0` | Global var definitions for ESLint. |
| `postcss` | `^8.5.15` | CSS processor. |
| `tailwindcss` | `^3.4.19` | Utility CSS framework. |
| `typescript` | `~6.0.2` | TS compiler. |
| `typescript-eslint` | `^8.59.2` | TS ESLint integration. |
| `vite` | `^8.0.12` | Build tool / dev server. |
