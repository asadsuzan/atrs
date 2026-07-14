# `client/src/components/ui/tabs.tsx`
**Purpose:** Minimal controlled tabs with no external dependency, mirroring the shadcn API surface (`Tabs` / `TabsList` / `TabsTrigger` / `TabsContent`) via a small React context.
**Language / Size:** TSX / 2117 bytes

## Exports
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (named components).

## Props
- `Tabs`: `value: string`, `onValueChange: (v: string) => void`, `className?`, `children` (controlled; provides context).
- `TabsList`: `className?`, `children` — pill container.
- `TabsTrigger`: `value: string`, `className?`, `children`, `title?` — a button that activates its value.
- `TabsContent`: `value: string`, `className?`, `children` — renders only when active.

## State / Refs / Context consumed
- `TabsContext` (`{ value, setValue }`) provided by `Tabs`; `useTabs()` throws `'Tabs.* must be used within <Tabs>'` if consumed outside.

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: react.

## Behavior / Rendering
- `TabsTrigger` reads active state from context; active → `bg-background text-foreground shadow-sm`, inactive → muted with hover. Clicking calls `setValue(value)`.
- `TabsContent` returns `null` when `active !== value` (unmounts inactive panels).

## Relationships
- No app contexts (uses its own `TabsContext`). Used for tabbed views (e.g. Product Details tabs).

## Edge cases & known limitations
- Fully controlled — no internal/default value state; the parent owns `value`.
- Inactive content is unmounted (state inside inactive tabs is not preserved).
