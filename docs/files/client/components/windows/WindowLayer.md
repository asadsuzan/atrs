# `client/src/components/windows/WindowLayer.tsx`
**Purpose:** Portals all open desktop windows plus a taskbar to `<body>` so they float above the routed page on any route.
**Language / Size:** TSX / 2535 bytes

## Exports
- `WindowLayer()` (named component, no props).

## Imports (Internal / External)
- Internal: `useWindowManager` from `../../contexts/WindowManagerContext`; `DesktopWindow` from `./DesktopWindow`.
- External: `createPortal` (react-dom).

## Props
None.

## State / Refs / Context consumed
- Context: `useWindowManager()` → `windows, close, focus, minimize, restore, toggleMaximize`.

## Hooks & Effects (deps, purpose)
None.

## Functions & handlers
- Renders one `DesktopWindow` per window, wiring `onFocus/onMinimize/onToggleMaximize/onClose` to the manager by id.
- Taskbar button `onClick`: if minimized → `restore`; else if active (top z, not minimized) → `minimize`; else → `focus`.

## Rendered UI
- Returns `null` when `windows.length === 0`.
- `createPortal` to `document.body` of:
  - A fixed, full-viewport surface (`z-[80]`, `pointer-events-none` so empty areas are click-through) mapping windows to `DesktopWindow`.
  - A fixed bottom taskbar (`z-[85]`, `h-11`, `pointer-events-auto`) listing windows sorted by `id.localeCompare`, each showing icon + truncated title; active window highlighted.

## Important logic & design patterns
- `topZ = Math.max(...windows.map(x => x.z))` identifies the active (front-most) window for taskbar styling and toggle behavior.
- Portal + pointer-events layering keeps windows floating over any route without blocking page interaction where there are no windows.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- Consumes `WindowManagerContext`. A global surface mounted in App.tsx; composes `DesktopWindow`.
