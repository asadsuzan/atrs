# `client/src/components/windows/DesktopWindow.tsx`
**Purpose:** A single draggable / resizable / minimizable / maximizable floating desktop-style window with a title bar and window controls.
**Language / Size:** TSX / 5384 bytes

## Exports
- `DesktopWindow({ meta, onFocus, onMinimize, onToggleMaximize, onClose })` (named component).

## Imports (Internal / External)
- Internal: `type WindowMeta` from `../../contexts/WindowManagerContext`.
- External: `useRef, useState` (react); icons `Minus, Square, Copy, X` (lucide-react).

## Props
- `meta: WindowMeta` (id, title, icon, content, initial rect, z, minimized, maximized).
- Callbacks: `onFocus`, `onMinimize`, `onToggleMaximize`, `onClose`.

## State / Refs / Context consumed
- Module constants: `MIN_W = 320`, `MIN_H = 200`.
- State: `rect` (initialized from `meta.initial`) — live position/size kept locally so dragging never re-renders the rest of the app.
- Ref: `dragRef` — holds `{ startX, startY, orig }` during a drag.

## Hooks & Effects (deps, purpose)
None (window pointer listeners are attached imperatively inside handlers, not via useEffect).

## Functions & handlers
- `beginDrag(e)`: no-op if maximized; calls `onFocus()`, records drag origin, attaches `pointermove`/`pointerup` on `window`. Movement clamps x to `[0, innerWidth - width]` and y to `[0, innerHeight - 48]`. Cleans up listeners on pointerup.
- `beginResize(e, dir)`: `dir` is `'e' | 's' | 'se'`; no-op if maximized; `stopPropagation()`, `onFocus()`; updates width (unless `s`) clamped to `[MIN_W, innerWidth - x]` and height (unless `e`) clamped to `[MIN_H, innerHeight - y]`.
- `WinButton` (local): control button; `onPointerDown` stops propagation so it doesn't start a drag; `danger` variant tints destructive (used for Close).

## Rendered UI
- Returns `null` when `meta.minimized`.
- Absolutely positioned `div role="dialog"` styled from `style` (maximized → full viewport minus 44px taskbar; else rect + `zIndex: meta.z`).
- Title bar (drag handle, double-click toggles maximize) with icon, title, and Minimize/Maximize-or-Restore/Close buttons.
- Content area renders `meta.content`.
- Three resize handles (e/s/se), hidden when maximized.

## Important logic & design patterns
- Local-state position/size isolates high-frequency drag/resize re-renders from the manager context (only focus/min/max touch the context).
- Viewport clamping keeps the window on-screen and title bar reachable.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- Consumes the `WindowMeta` type from `WindowManagerContext`; instantiated by `WindowLayer`, which supplies the manager callbacks.
