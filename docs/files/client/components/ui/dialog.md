# `client/src/components/ui/dialog.tsx`
**Purpose:** shadcn/ui modal dialog wrapping Radix Dialog — styled overlay, scrollable centered content with a built-in close button, and header/footer/title/description sections.
**Language / Size:** TSX / 4024 bytes

## Exports
`Dialog`, `DialogPortal`, `DialogOverlay`, `DialogTrigger`, `DialogClose`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`.

## Radix primitive wrapped
- `@radix-ui/react-dialog` (`DialogPrimitive`). File is marked `"use client"`.

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: react, `@radix-ui/react-dialog`, lucide-react (`X`).

## Behavior / Rendering
- `Dialog`/`Trigger`/`Portal`/`Close` — direct primitive re-exports.
- `DialogOverlay` — fixed `bg-black/40 backdrop-blur-sm` with fade animations.
- `DialogContent` — portals overlay + centered content (`w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto`, `rounded-xl`, zoom/slide animations); appends a top-right `DialogPrimitive.Close` with an `X` icon and screen-reader label.
- `DialogHeader`/`Footer`/`Title`/`Description` — styled layout/text sections.

## Relationships
- No contexts. Reused by `command.tsx` (CommandDialog) and `media-lightbox.tsx`, plus app-level modals.

## Edge cases & known limitations
- The auto-injected close button is styled via content; callers overriding it use `[&>button]` selectors (see `media-lightbox`).
