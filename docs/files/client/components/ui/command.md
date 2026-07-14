# `client/src/components/ui/command.tsx`
**Purpose:** shadcn/ui command palette built on `cmdk`, with an optional dialog wrapper — searchable command/menu list.
**Language / Size:** TSX / 4873 bytes

## Exports
`Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandShortcut`, `CommandSeparator`.

## Primitive wrapped
- `cmdk` (`Command as CommandPrimitive`); `CommandDialog` composes the shared `Dialog`/`DialogContent`.

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`), `Dialog, DialogContent` (`@/components/ui/dialog`).
- External: react, `@radix-ui/react-dialog` (`DialogProps` type), `cmdk`, lucide-react (`Search`).

## Behavior / Rendering
- `Command` — flex column, `bg-popover`, rounded, overflow-hidden.
- `CommandDialog` — renders `Command` inside a `DialogContent` with cmdk-specific spacing overrides (via `[&_[cmdk-*]]` selectors).
- `CommandInput` — search row with a leading `Search` icon and a borderless input.
- `CommandList` — scrollable (`max-h-[300px]`).
- `CommandEmpty` — centered "no results" text.
- `CommandGroup` — padded group with styled `cmdk-group-heading`.
- `CommandItem` — selectable row; `data-[selected=true]` → accent bg, `data-[disabled=true]` → dimmed.
- `CommandSeparator` — hairline; `CommandShortcut` — right-aligned muted hint span.

## Relationships
- No contexts. Depends on the shared `Dialog`. Used for command/search palette surfaces.
