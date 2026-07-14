# `client/src/pages/ReadmeTools.tsx`

**Purpose / Route:** Readme Tools page mounted at `/readme-tools`. Preview and validate WordPress.org plugin `readme.txt` files. Provides a tab switcher across three tools: an in-app Image Framer, an embedded wpreadme.com readme viewer (iframe), and the official WordPress.org readme validator (embedded via a same-origin reverse proxy). Iframe tools support fullscreen and open-in-new-tab; the Image Framer can be popped into a window manager window.
**Language / Size:** TSX / 11207 bytes

## Exports
- `default function ReadmeTools()` — the page component.

## Imports (Internal / External)
**External:**
- `react` — `useEffect`, `useRef`, `useState`
- `react-dom` — `createPortal`
- `lucide-react` — `FileText`, `Eye`, `ShieldCheck`, `ExternalLink`, `Loader2`, `Maximize2`, `Minimize2`, `AppWindow`

**Internal:**
- `../components/layout/PageTransition` — `PageTransition` (default)
- `@/components/ui/skeleton` — `Skeleton`
- `../components/tools/ImageFramer` — `ImageFramer`
- `../contexts/WindowManagerContext` — `useWindowManager`

## Component tree & sub-components defined
**Module-level constants:**
- `type Tool = 'viewer' | 'validator' | 'framer'`.
- `WPREADME_URL = 'https://wpreadme.com/'`.
- `VALIDATOR_URL = 'https://wordpress.org/plugins/developers/readme-validator/'`.
- `VALIDATOR_PROXY_URL = '/api/tools/readme-validator'` — same-origin reverse proxy that strips `X-Frame-Options` so the validator can be embedded (comment references `server/src/controllers/ReadmeToolsController.ts`).
- `interface ToolConfig { src, title, label, externalUrl, referrerPolicy?, blurb }`.
- `TOOLS: Record<Tool, ToolConfig>` — config for framer (no src/externalUrl), viewer (src=WPREADME_URL, `referrerPolicy: 'no-referrer'`), validator (src=VALIDATOR_PROXY_URL, externalUrl=VALIDATOR_URL).

**Sub-components defined in-file:**
- `ReadmeTools` (default) — page shell + tab state + fullscreen portal.
- `ToolSwitcher({ tool, setTool })` — segmented tab bar (Image Framer / Viewer / Validator).
- `TabButton({ active, onClick, icon, label })` — a single tab button.
- `FrameControls({ externalUrl, onFullscreen })` — floating top-right open-in-new-tab + fullscreen buttons over the inline frame.
- `IframeWithLoader({ config, className })` — iframe with loading overlay and slow-load fallback.
- `FrameLoader({ label, slow, fallbackUrl })` — skeleton + spinner overlay; shows "Open in new tab" fallback when slow.

## State / Refs / Context consumed
- `ReadmeTools`: `tool` (`useState<Tool>('framer')`), `fullscreen` (bool). Context: `open: openWindow` (WindowManagerContext).
- `IframeWithLoader`: `loaded` (bool), `slow` (bool), `slowTimer` (`useRef<setTimeout | null>`).

## Hooks & Effects (deps, purpose, WHY)
- `ReadmeTools` `useEffect([fullscreen])` — when fullscreen: adds a `keydown` listener so `Escape` exits fullscreen, and sets `document.body.style.overflow = 'hidden'` to lock body scroll while the popup is open; cleanup removes the listener and restores previous overflow. Early-returns when not fullscreen.
- `IframeWithLoader` `useEffect([])` — starts an 8000ms timer that sets `slow = true` (slow-load fallback); cleared on unmount.

## Data fetching (services/endpoints; react-query keys/mutations)
- No react-query. Content is fetched by browser `<iframe>` loads:
  - Viewer iframe → `https://wpreadme.com/` (`referrerPolicy="no-referrer"`).
  - Validator iframe → `/api/tools/readme-validator` (same-origin proxy to the WordPress.org validator).
- No mutations.

## Event handlers & key functions
- `setTool(t)` — switches active tool tab.
- "Open in window" button — `openWindow({ id: 'image-framer', title, icon, content: <ImageFramer/>, width: 1100, height: 720 })` (window manager).
- `FrameControls` — external-URL anchor (`target="_blank"`) and `onFullscreen` → `setFullscreen(true)`.
- `IframeWithLoader.handleLoaded()` — on iframe `onLoad`: sets `loaded`, clears `slow`, clears the slow timer.
- Fullscreen exit — `Minimize2` button + `Escape` key both `setFullscreen(false)`.

## Rendered UI sections
- Header: `FileText` "Readme Tools" title + subtitle referencing `readme.txt`; `ToolSwitcher`.
- Inline panel: `config.blurb`; if `tool === 'framer'` renders an "Open in window" button + inline `<ImageFramer/>`; otherwise a bordered frame with `FrameControls` + `IframeWithLoader` (`h-[calc(100vh-220px)] min-h-[600px]`).
- Fullscreen popup (only when `fullscreen && tool !== 'framer'`): `createPortal` to `document.body`, `fixed inset-0 z-[100]`, with a top bar (title, `ToolSwitcher`, Exit fullscreen) and a flex-filling `IframeWithLoader`.
- `IframeWithLoader`: iframe fades in (`opacity` transition) once loaded; `loading="lazy"`; overlay `FrameLoader` while not loaded.
- `FrameLoader`: faux skeleton content + centered spinner "Loading {label}…"; when slow, shows "This is taking longer than usual." and an "Open in new tab" link.

## Important logic & design patterns
- Config-driven tool switching: a single `TOOLS` map defines src/title/label/externalUrl/referrerPolicy/blurb per tool; UI derives from `config = TOOLS[tool]`.
- Cross-origin embedding worked around via a same-origin reverse proxy (`VALIDATOR_PROXY_URL`) that strips `X-Frame-Options` server-side.
- Fullscreen implemented with a React portal to `<body>` to escape the page's framer-motion transform and cover the whole viewport (comment explains why).
- Body-scroll lock + Escape-to-exit while fullscreen for a modal-like popup.
- `key={tool}` / `key={`fs-${tool}`}` on `IframeWithLoader` forces remount (fresh load state) when switching tools or entering fullscreen.
- Slow-load UX: 8s timer surfaces an escape-hatch external link when an embed stalls.
- Image Framer offered both inline and as a draggable window via WindowManagerContext.

## Relationships
- Consumes WindowManagerContext to launch the Image Framer in a managed window; embeds `ImageFramer` component from `../components/tools`.
- Depends on a server route `/api/tools/readme-validator` (proxy), per the in-file comment pointing to `server/src/controllers/ReadmeToolsController.ts`.
- Otherwise self-contained; no app data services or react-query usage.
