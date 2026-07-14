# `client/src/components/ErrorBoundary.tsx`
**Purpose:** Top-level React class error boundary that catches render-time errors anywhere in the tree and shows a friendly fallback with a reload action instead of a blank screen.
**Language / Size:** TSX / 1588 bytes

## Exports
- `ErrorBoundary` (named class component extending `Component<ErrorBoundaryProps, ErrorBoundaryState>`).

## Imports (Internal / External)
- External: `Component, type ErrorInfo, type ReactNode` (react).

## Props
- `ErrorBoundaryProps`: `children: ReactNode`.

## State / Refs / Context consumed
- `ErrorBoundaryState`: `hasError: boolean` (initial `false`).
- No context.

## Hooks & Effects (deps, purpose)
- N/A (class component). Lifecycle: `static getDerivedStateFromError()` → `{ hasError: true }`; `componentDidCatch(error, info)` → `console.error('Uncaught error:', error, info)`.

## Functions & handlers
- `handleReload = () => window.location.assign('/')` — reloads to the app root.

## Rendered UI
- When `hasError`: full-screen centered fallback with "Something went wrong", an explanatory paragraph, and a "Reload app" button.
- Otherwise renders `this.props.children`.

## Important logic & design patterns
- Class component because error boundaries require the class lifecycle (no hook equivalent).
- Logs the error to the console but recovery is manual (full navigation to `/`), so it does not attempt to re-render the failed subtree in place.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- No contexts. Wraps the application at the root (App.tsx / entrypoint) as a global safety surface.
