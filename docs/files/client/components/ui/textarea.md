# `client/src/components/ui/textarea.tsx`
**Purpose:** shadcn/ui textarea — styled `<textarea>` with forwarded ref.
**Language / Size:** TSX / 731 bytes

## Exports
- `Textarea` (`React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>`, `displayName = 'Textarea'`).

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: react.

## Behavior / Rendering
- `min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base shadow-sm`, focus ring (`ring-ring/60`), disabled styles, `md:text-sm`; merges caller `className`.

## Relationships
- No contexts. Foundational form control; used in forms for multi-line text.
