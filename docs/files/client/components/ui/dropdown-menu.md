# `client/src/components/ui/dropdown-menu.tsx`
**Purpose:** shadcn/ui dropdown menu wrapping Radix Dropdown Menu — full set of menu parts (items, checkbox/radio items, submenus, labels, separators, shortcuts).
**Language / Size:** TSX / 7592 bytes

## Exports
`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuRadioGroup`.

## Radix primitive wrapped
- `@radix-ui/react-dropdown-menu` (`DropdownMenuPrimitive`).

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: react, `@radix-ui/react-dropdown-menu`, lucide-react (`Check, ChevronRight, Circle`).

## Behavior / Rendering
- `Root`/`Trigger`/`Group`/`Portal`/`Sub`/`RadioGroup` are direct re-exports.
- `DropdownMenuContent` — portaled, `min-w-[8rem]`, scroll-capped to available height, `shadow-md`, full open/close + side-slide animations; default `sideOffset={4}`.
- `DropdownMenuSubTrigger` — item with trailing `ChevronRight`; `inset` prop adds left padding.
- `DropdownMenuSubContent` — like Content but `shadow-lg`.
- `DropdownMenuItem` — focusable row, `inset` option, disabled/hover styles.
- `DropdownMenuCheckboxItem` / `RadioItem` — left indicator slot rendering `Check` / filled `Circle` via `ItemIndicator`.
- `DropdownMenuLabel` (`inset` option), `DropdownMenuSeparator` (hairline), `DropdownMenuShortcut` (right-aligned muted span).

## Relationships
- No contexts. Standard menu primitive; used for row/action menus across list pages.
