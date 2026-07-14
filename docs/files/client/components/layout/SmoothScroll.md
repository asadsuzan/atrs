# `client/src/components/layout/SmoothScroll.tsx`
**Purpose:** Wraps the app in a Lenis smooth-scroll root while yielding to nested scrollable containers so inner panels still scroll natively.
**Language / Size:** TSX / 1594 bytes

## Exports
- `default` `SmoothScroll({ children })` component.

## Imports (Internal / External)
- External: `ReactLenis` from `lenis/react`.

## Props
- `children: React.ReactNode`.

## State / Refs / Context consumed
None.

## Hooks & Effects (deps, purpose)
None.

## Functions & handlers
- `isWithinScrollable(node)`: walks up from the event target (until `document.body`/`documentElement`); returns `true` if any ancestor `HTMLElement` has `data-lenis-prevent` set, or has `overflowY` auto/scroll with `scrollHeight > clientHeight`, or `overflowX` auto/scroll with `scrollWidth > clientWidth`. Used as the Lenis `prevent` predicate.

## Rendered UI
- `<ReactLenis root options={{ lerp: 0.08, duration: 1.5, smoothWheel: true, prevent: (node) => isWithinScrollable(node) }}>` wrapping `children`.

## Important logic & design patterns
- Lets the browser scroll nested containers (dialogs, sidebar, log consoles, dropdowns) natively rather than smooth-scrolling the whole page; `data-lenis-prevent` provides an explicit opt-out hook.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- No contexts. A global wrapper mounted high in the app tree (App.tsx).
