# `client/src/components/ui/RichText.tsx`
**Purpose:** Renders stored description content as authored — sanitized rich HTML is injected; legacy plain text is rendered with preserved line breaks. Sanitization is memoized.
**Language / Size:** TSX / 1099 bytes

## Exports
- `RichText({ html, className, fallback })` (named component).

## Props
- `html?: string | null` — stored content.
- `className?: string` — merged with the `rich-content` class.
- `fallback?: React.ReactNode` (default `null`) — rendered when content is empty.

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`); `sanitizeRichHtml, looksLikeHtml, isRichTextEmpty` (`@/lib/richText`).
- External: `useMemo` (react).

## Behavior / Rendering
- `value = html || ''`; `isHtml = looksLikeHtml(value)`; `clean = useMemo(() => isHtml ? sanitizeRichHtml(value) : '', [value, isHtml])`.
- If `isRichTextEmpty(value)` → renders `<>{fallback}</>`.
- If `isHtml` → `<div class="rich-content ...">` with `dangerouslySetInnerHTML={{ __html: clean }}`.
- Otherwise (legacy plain text) → `<div class="rich-content whitespace-pre-wrap">{value}</div>` (no markup interpretation).

## Relationships
- No contexts. Read-side counterpart to `RichTextEditor`; both share `@/lib/richText` helpers and the `rich-content` CSS class.

## Edge cases & known limitations
- Safety depends entirely on `sanitizeRichHtml` (DOMPurify) — raw HTML is only injected after sanitizing.
- The empty check runs on the raw `value`, so whitespace-only HTML is handled by `isRichTextEmpty`, not by the memo.
