# `client/src/lib/utils.ts`
**Purpose:** The `cn` class-name helper — merges conditional class values (clsx) and de-conflicts Tailwind utility classes (tailwind-merge). The standard shadcn/ui utility used across all components.
**Language / Size:** TypeScript / 166 bytes

## Exports
- `cn(...inputs: ClassValue[]): string` — named export.

## API / Signature
- `cn(...inputs: ClassValue[])` → merged class string. `ClassValue` is clsx's union (strings, arrays, conditional objects, etc.).

## Imports (Internal / External)
Internal: none.
External: `clsx` (`clsx`, type `ClassValue`); `tailwind-merge` (`twMerge`).

## Behavior / Implementation
- `twMerge(clsx(inputs))` — `clsx` normalizes/joins the inputs into a class string, then `twMerge` resolves conflicting Tailwind utilities so the last-declared wins (e.g. `px-2` overriding an earlier `px-4`).

## Data structures / Types / Constants
None beyond the imported `ClassValue` type.

## Relationships
- Imported pervasively by UI components (shadcn/ui convention) for composing conditional/variant class names.

## Edge cases & known limitations
- tailwind-merge only understands standard Tailwind utility patterns; fully custom/arbitrary classes it can't recognize are passed through without conflict resolution.
