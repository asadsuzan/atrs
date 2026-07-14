# `client/src/components/ai/AiAssist.tsx`
**Purpose:** Reusable AI helper buttons for forms: a "✨ Suggest" title picker (popover of options) and a "✨ Generate" description button, both grounded in caller-supplied form context.
**Language / Size:** TSX / 5029 bytes

## Exports
- `SuggestTitleButton({ entity, getContext, onPick, disabled?, label? })`.
- `GenerateDescriptionButton({ entity, getContext, getTitle?, onResult, disabled?, label? })`.

## Imports (Internal / External)
- Internal: `suggestTitles, suggestDescription` from `../../services/ai`; UI `Popover, PopoverTrigger, PopoverContent` (`@/components/ui/popover`).
- External: `useState` (react); icons `Sparkles, Loader2, RefreshCw` (lucide-react); `toast` (sonner).

## Props
- `SuggestTitleButton`: `entity: string`, `getContext: () => Record<string,any>`, `onPick: (title:string)=>void`, `disabled?`, `label?` (default "Suggest").
- `GenerateDescriptionButton`: `entity`, `getContext`, `getTitle?: () => string|undefined`, `onResult: (text:string)=>void`, `disabled?`, `label?` (default "Generate").

## State / Refs / Context consumed
- Module const: `btnBase` (shared button classes).
- `SuggestTitleButton` state: `open`, `loading`, `titles: string[]`.
- `GenerateDescriptionButton` state: `loading`.
- No context.

## Hooks & Effects (deps, purpose)
None (async work runs in click handlers).

## Functions & handlers
- `fetchTitles()`: `setLoading(true)`; `await suggestTitles(entity, getContext())`; empty → `toast.info`; error → `toast.error(err?.response?.data?.message || 'Could not get suggestions.')` and closes popover; always clears loading.
- `run()` (Generate): `await suggestDescription(entity, getContext(), getTitle?.())`; success → `onResult(text)` + success toast; empty → info toast; error → error toast; always clears loading.
- Trigger opens the popover and immediately fetches; a "Regenerate" button re-runs `fetchTitles`; picking an option calls `onPick(t)` and closes.

## Rendered UI
- `SuggestTitleButton`: trigger button (Sparkles/spinner + label) → popover with "AI suggestions" header + Regenerate, a "Thinking…" state, empty state, or a scrollable list of clickable suggestions.
- `GenerateDescriptionButton`: a single button (Sparkles/spinner + label).

## Important logic & design patterns
- `getContext()` (and `getTitle()`) are evaluated at click time so suggestions see the latest form state.
- Entity-agnostic so it can be dropped into any ATRS form.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- No app contexts. Not an App.tsx global surface; embedded in individual forms. Depends on the AI service layer.
