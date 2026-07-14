# `client/src/components/ui/card.tsx`
**Purpose:** shadcn/ui card primitives — a container plus header/title/description/content/footer sections.
**Language / Size:** TSX / 1828 bytes

## Exports
`Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardDescription`, `CardContent` — all `React.forwardRef` `<div>` wrappers with display names.

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: react.

## Behavior / Rendering
- `Card` — `rounded-xl border bg-card text-card-foreground shadow`.
- `CardHeader` — `flex flex-col space-y-1.5 p-6`.
- `CardTitle` — `font-semibold leading-none tracking-tight`.
- `CardDescription` — `text-sm text-muted-foreground`.
- `CardContent` — `p-6 pt-0`.
- `CardFooter` — `flex items-center p-6 pt-0`.

## Relationships
- No contexts. Foundational layout primitive; reused heavily (including by `skeletons.tsx`).
