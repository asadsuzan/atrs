# `client/src/components/layout/PageTransition.tsx`
**Purpose:** Framer-motion wrapper and shared animation variants for animated route/page transitions and staggered list reveals.
**Language / Size:** TSX / 1121 bytes

## Exports
- `pageVariants` (Variants): `initial` (opacity 0, y 10, blur 4px), `in` (opacity 1, y 0, blur 0), `out` (opacity 0, y -10, blur 4px).
- `pageTransition` (any): spring, stiffness 260, damping 20.
- `staggerContainer` (Variants): `hidden` opacity 0; `show` opacity 1 with `staggerChildren: 0.1`.
- `staggerItem` (Variants): `hidden` (opacity 0, y 20, blur 4px); `show` (opacity 1, y 0, blur 0) spring stiffness 300 damping 24.
- `default` `PageTransition({ children, className? })` component.

## Imports (Internal / External)
- External: `motion, type Variants` (framer-motion).

## Props
- `PageTransition`: `children: React.ReactNode`, `className?: string` (default `""`).

## State / Refs / Context consumed
None.

## Hooks & Effects (deps, purpose)
None.

## Functions & handlers
None.

## Rendered UI
- A `motion.div` with `initial="initial" animate="in" exit="out"`, `variants={pageVariants}`, `transition={pageTransition}`, class `w-full ${className}`, wrapping `children`.

## Important logic & design patterns
- Centralizes reusable animation variants so pages/lists share consistent motion (blur+slide fade, spring physics).
- `exit="out"` designed to work under an `AnimatePresence` parent.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- No contexts. Used by page/route components for enter/exit animation; variants imported by list components for stagger effects.
