# `client/src/main.tsx`
**Purpose:** Client entry point. Mounts the React app to the DOM.
**Language / Size:** TSX / 345 bytes

## Behavior
- Imports `StrictMode` (react), `createRoot` (react-dom/client), `./index.css` (global styles), `App` from `./App.tsx`, and `ErrorBoundary` from `./components/ErrorBoundary`.
- `createRoot(document.getElementById('root')!)` — mounts on the `#root` element (non-null asserted).
- Render tree: `<StrictMode>` → `<ErrorBoundary>` → `<App />`.

## Relationships
- The Vite HTML entry loads this module; it wires the top-level error boundary around the whole app. All routing/providers live in `App.tsx`.
