# `client/src/contexts/WindowManagerContext.tsx`
**Purpose:** A lightweight desktop-style window manager. Tracks a set of floating windows (each with title/icon/content/z-index/min/max state), and exposes open/close/focus/minimize/restore/toggle-maximize actions. Used by the Readme Tools "windows" UI.
**Language / Size:** TSX / 3835 bytes

## Exports (Provider, hook, types, functions)
- `WindowRect`, `WindowMeta`, `OpenWindowOptions` — exported interfaces.
- `useWindowManager()` — hook; throws `'useWindowManager must be used within WindowManagerProvider'`.
- `WindowManagerProvider({ children })` — provider.
- `WindowManagerContextValue` — interface (internal).

## Imports (Internal / External)
Internal: none.
External: `react` (`createContext`, `useCallback`, `useContext`, `useRef`, `useState`, `type ReactNode`).

## Context shape (the value object)
```ts
interface WindowManagerContextValue {
  windows: WindowMeta[];
  open: (opts: OpenWindowOptions) => string;   // returns the window id
  close: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  restore: (id: string) => void;
  toggleMaximize: (id: string) => void;
}
interface WindowMeta { id; title; icon?: ReactNode; content: ReactNode; z: number; minimized: boolean; maximized: boolean; initial: WindowRect; }
interface WindowRect { x; y; width; height; }
interface OpenWindowOptions { id?; title; icon?; content; width?; height?; x?; y?; }
```

## State managed & how it's updated
- `windows: WindowMeta[]` (`useState`, init `[]`) — the live window list.
- `zRef: number` (`useRef`, init `10`) — monotonically increasing z-index counter; `++zRef.current` on focus/open/maximize.
- Module-level `uid` counter with `nextId()` → `win-${++uid}` for auto-generated ids.

## Hooks & Effects (deps, purpose, WHY)
No `useEffect`. All actions are `useCallback`-memoized for stable identity. `zRef`/`uid` avoid re-renders for counters.

## Functions (purpose, algorithm, side effects)
- `focus(id)` — bumps the window's `z` and un-minimizes it; no-op if not found.
- `open(opts)` — id = `opts.id ?? nextId()`. If a window with that id exists, re-focus/un-minimize and refresh its `content`/`title` (stable-id reuse). Otherwise create one: default width 760 / height 560; **cascades** new windows (`x/y = min(80 + count*28, viewport - size - margin)`) so they don't stack exactly; returns the id.
- `close(id)` — filters the window out.
- `minimize(id)` — sets `minimized: true`.
- `restore(id)` — delegates to `focus`.
- `toggleMaximize(id)` — flips `maximized`, clears `minimized`, bumps `z`.
- Note: live position/size after open are owned by the window component (only `initial` geometry is stored here).

## Consumed by
`components/windows/WindowLayer.tsx`, `pages/ReadmeTools.tsx`.

## Important logic & design patterns
- Stable-id semantics: opening the same `id` re-focuses/refreshes instead of duplicating.
- Cascade positioning based on current window count.
- Ref-held z-counter and uid so counters don't cause renders.
