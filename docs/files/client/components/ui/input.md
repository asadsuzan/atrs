# `client/src/components/ui/input.tsx`
**Purpose:** shadcn/ui text input — styled `<input>` with forwarded ref.
**Language / Size:** TSX / 832 bytes

## Exports
- `Input` (`React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>`, `displayName = 'Input'`).

## Props
- All native input props; `type` and `className` are pulled out (className merged via `cn`).

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: react.

## Behavior / Rendering
- `h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-base shadow-sm`, focus ring (`ring-ring/60`), file-input styling, disabled styles, `md:text-sm`.

## Relationships
- No contexts. Foundational; wrapped by `PasswordInput` and used by `Pagination`, forms, filters.
