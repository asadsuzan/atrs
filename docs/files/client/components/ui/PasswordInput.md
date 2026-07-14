# `client/src/components/ui/PasswordInput.tsx`
**Purpose:** Password field with a show/hide toggle; a drop-in replacement for `<Input>` on password fields.
**Language / Size:** TSX / 1331 bytes

## Exports
- `PasswordInput` (named; `React.forwardRef<HTMLInputElement, ...>`, `displayName = 'PasswordInput'`).

## Props
- `Omit<React.ComponentProps<'input'>, 'type'>` — all normal input props except `type` (which the component controls). `className` is merged onto the inner `Input`.

## State / Refs / Context consumed
- `visible` — toggles the input `type` between `'text'` and `'password'`.
- Forwards `ref` to the inner `Input`.

## Imports (Internal / External)
- Internal: `Input` (`./input`), `cn` (`@/lib/utils`).
- External: lucide-react (`Eye, EyeOff`); react.

## Behavior / Rendering
- Wraps `Input` in a `relative` div with right-padding (`pr-9`); overlays a `type="button"` toggle (`tabIndex={-1}`, aria-label/title reflect state) that flips `visible` and swaps the `Eye`/`EyeOff` icon.

## Relationships
- No contexts. Wraps the shared `Input`; used by auth/password forms.

## Edge cases & known limitations
- Toggle is `tabIndex={-1}` (not in tab order) by design; still mouse/click accessible with an aria-label.
