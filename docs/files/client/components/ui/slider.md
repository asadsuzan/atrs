# `client/src/components/ui/slider.tsx`
**Purpose:** Lightweight numeric slider built on a native `<input type="range">` (no external dependency), themed to the primary accent.
**Language / Size:** TSX / 947 bytes

## Exports
- `Slider(props: SliderProps)` (named component).
- `interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'>`.

## Props
- `value: number` (controlled).
- `min?: number` (default 0), `max?: number` (default 100), `step?: number` (default 1).
- `onChange: (value: number) => void` — emits the parsed number directly.
- Plus remaining input attributes (`...rest`) and `className`.

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: react.

## Behavior / Rendering
- Renders a native range input; `onChange` converts `e.target.value` via `Number(...)`. Inline `style={{ accentColor: 'hsl(var(--primary))' }}` themes the control; base classes `h-1.5 w-full rounded-full bg-muted`.

## Relationships
- No contexts. Used where a simple numeric range is needed (settings/filters).

## Edge cases & known limitations
- Relies on the browser's native range styling beyond `accentColor`; no custom thumb/track markup.
