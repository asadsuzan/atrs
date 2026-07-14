# `client/src/contexts/JobDockContext.tsx`
**Purpose:** A global, draggable "dock" hosting every floating job board (WP import, bulk jobs, image-framer exports). Boards portal into one shared stack via `<DockBoard>`, so they are reachable on any page, never fight for the same corner (they stack sequentially), and move together when the dock is dragged.
**Language / Size:** TSX / 5777 bytes

## Exports (Provider, hook, types, functions)
- `JobDockProvider({ children })` — provider; renders the dock (portaled to `document.body`).
- `DockBoard({ id, order = 0, children })` — portals its children into the shared dock stack and registers itself in the job counter.
- `useJobDock()` — internal hook (NOT exported); throws `'useJobDock must be used within JobDockProvider'`.
- `JobDockContextValue` — interface (internal).

## Imports (Internal / External)
Internal: none.
External:
- `react` (`createContext`, `useCallback`, `useContext`, `useEffect`, `useRef`, `useState`, `type ReactNode`)
- `react-dom` (`createPortal`)
- `lucide-react` (`GripVertical`)

## Context shape (the value object)
```ts
interface JobDockContextValue {
  node: HTMLElement | null;            // the dock DOM node boards portal into
  startDrag: (e: React.PointerEvent) => void;
  register: (id: string) => void;      // increments the job counter
  unregister: (id: string) => void;    // decrements the job counter
}
```

## State managed & how it's updated
- `node: HTMLElement | null` (init `null`) — set via `setDockRef` callback ref when the dock div mounts.
- `count: number` (init `0`) — number of docked boards; `register`→`+1`, `unregister`→`max(0, -1)`.
- `dockRef: HTMLDivElement | null` (`useRef`) — for measuring/clamping.
- `pos: Pos` (`{x,y} | null`, lazy init from `localStorage['jobDock.pos']`) — `null` means default anchor (bottom-right, `MARGIN=16`); otherwise explicit viewport coords.
- Constants: `POS_KEY = 'jobDock.pos'`, `MARGIN = 16`.

## Hooks & Effects (deps, purpose, WHY)
- `setDockRef = useCallback((el) => { dockRef.current = el; setNode(el); }, [])` — callback ref capturing the dock node into both ref and state.
- `register`/`unregister = useCallback(..., [])`.
- `useEffect([pos])` — on window `resize`, clamps a stored position so the dock stays on-screen if the viewport shrinks; only active when `pos` is set. Cleans up the listener.
- `startDrag = useCallback((e) => {...}, [])` — pointer-drag: computes cursor offset from the dock rect, attaches window `pointermove` (clamps x/y to viewport) and `pointerup` (persists final `pos` to localStorage, ignoring quota errors) listeners.
- `DockBoard`'s `useEffect([id, register, unregister])` — `register(id)` on mount, `unregister(id)` on unmount, so board presence drives the counter/handle.

## Functions (purpose, algorithm, side effects)
- Dock render: `createPortal` into `document.body` a `fixed z-[100]` column (`pointer-events-none`), positioned via `dockStyle` (`{left,top}` from pos, else `{right,bottom}=MARGIN`). Shows a drag handle (`GripVertical` + `"{count} job(s)"`) only when `count > 0`, with `order: -1` so the handle sits above the boards.
- `DockBoard` returns `null` until `node` exists, then `createPortal`s a `pointer-events-auto w-80` wrapper (with CSS `order`) into the dock node.

## Consumed by
`DockBoard` used by: `components/jobs/ChangelogGenMiniPlayer.tsx`, `components/jobs/JobStreamMiniPlayer.tsx`, `components/products/WpImportMiniPlayer.tsx`, `components/tools/FramerExportBoard.tsx`. `useJobDock` is internal-only.

## Important logic & design patterns
- Single shared portal stack + CSS `order` prop for deterministic board stacking.
- Callback-ref-into-state so consumers re-render once the dock node is available.
- Position persistence in localStorage with viewport clamping on resize and during drag.
- `pointer-events-none` container with `pointer-events-auto` children so the dock overlay doesn't block the page except on actual boards/handle.
