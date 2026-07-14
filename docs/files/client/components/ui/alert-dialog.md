# `client/src/components/ui/alert-dialog.tsx`
**Purpose:** shadcn/ui wrapper around Radix Alert Dialog — a modal confirmation dialog with styled overlay, content, header/footer, and action/cancel buttons.
**Language / Size:** TSX / 4572 bytes

## Exports
`AlertDialog`, `AlertDialogPortal`, `AlertDialogOverlay`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`.

## Radix primitive wrapped
- `@radix-ui/react-alert-dialog` (`AlertDialogPrimitive`).

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`), `buttonVariants` (`@/components/ui/button`).
- External: react, `@radix-ui/react-alert-dialog`.

## Behavior / Rendering
- `AlertDialog`/`Trigger`/`Portal` are direct primitive re-exports.
- `AlertDialogOverlay` — fixed `bg-black/40 backdrop-blur-sm` with open/close fade animations.
- `AlertDialogContent` — portals overlay + centered content (`max-w-lg`, `rounded-xl`, shadow, zoom/slide animations).
- `AlertDialogHeader`/`Footer` — layout `div`s (footer is `flex-col-reverse sm:flex-row sm:justify-end`).
- `AlertDialogTitle`/`Description` — styled text primitives.
- `AlertDialogAction` — styled with `buttonVariants()` (default variant).
- `AlertDialogCancel` — styled with `buttonVariants({ variant: 'outline' })` plus top margin on mobile.

## Relationships
- No contexts. Shares `buttonVariants` with `Button`; used for destructive/confirm flows (e.g. delete confirmations).

## Edge cases & known limitations
- Thin styling wrapper; behavior (focus trap, escape handling) is entirely Radix's.
