# `client/src/components/ui/form.tsx`
**Purpose:** shadcn/ui form helpers integrating `react-hook-form` — context-driven field wiring (`FormField`/`FormItem`), accessible labels/controls/descriptions, and automatic error messages.
**Language / Size:** TSX / 4175 bytes

## Exports
- `Form` (alias of `FormProvider`), `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `FormField`, and the `useFormField` hook.

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`), `Label` (`@/components/ui/label`).
- External: react, `@radix-ui/react-label`, `@radix-ui/react-slot` (`Slot`), `react-hook-form` (`Controller, FormProvider, useFormContext`, types `ControllerProps, FieldPath, FieldValues`).

## State / Refs / Context consumed
- `FormFieldContext` — carries the current field `name` (set by `FormField`).
- `FormItemContext` — carries a generated `id` (via `React.useId()`, set by `FormItem`).
- `useFormField()` consumes both plus RHF's `useFormContext` to derive `getFieldState`/`formState`.

## Behavior / Rendering
- `FormField` — generic wrapper around RHF `Controller`, providing `FormFieldContext` with `props.name`.
- `useFormField` — throws if used outside `<FormField>` or `<FormItem>`; returns `{ id, name, formItemId, formDescriptionId, formMessageId, ...fieldState }` (derived ARIA ids).
- `FormItem` — `div` with `space-y-2` providing `FormItemContext`.
- `FormLabel` — `Label` with `htmlFor={formItemId}`, turns `text-destructive` on error.
- `FormControl` — Radix `Slot` wiring `id`, `aria-describedby` (description, plus message on error), and `aria-invalid`.
- `FormDescription` — muted `<p>` with `id={formDescriptionId}`.
- `FormMessage` — `<p>` showing the field error message (or `children`); renders `null` when there is no body.

## Data structures / Types / Constants
- `FormFieldContextValue<TFieldValues, TName>` (`{ name }`); `FormItemContextValue` (`{ id }`).

## Relationships
- No app contexts (uses its own + RHF). Depends on `Label`. Used by all react-hook-form-based forms.

## Edge cases & known limitations
- `useFormField` requires the full `FormField` + `FormItem` nesting; misuse throws at render.
