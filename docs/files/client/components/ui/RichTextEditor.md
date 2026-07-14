# `client/src/components/ui/RichTextEditor.tsx`
**Purpose:** Lightweight rich-text editor for description fields, built on `contentEditable` (no heavy editor runtime) with a formatting toolbar and DOMPurify sanitization on paste and on every change.
**Language / Size:** TSX / 5653 bytes

## Exports
- `RichTextEditor({ value, onChange, placeholder, className, ariaLabel })` (named component).

## Props
- `value: string` — HTML content (controlled from outside, but internally uncontrolled — see below).
- `onChange: (html: string) => void` — emits the editor's current `innerHTML`.
- `placeholder?: string` — shown as an overlay when empty; also default `aria-label`.
- `className?: string`, `ariaLabel?: string`.

## State / Refs / Context consumed
- `ref` — the contentEditable `<div>`.
- `focused` — drives the focus ring.
- `empty` — placeholder visibility, tracked via `isRichTextEmpty`.

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`); `sanitizeRichHtml, plainTextToHtml, isRichTextEmpty` (`@/lib/richText`).
- External: lucide-react icons (`Bold, Italic, Underline, Strikethrough, List, ListOrdered, Link2, Code, Quote, Heading, Eraser`); react (`useCallback, useEffect, useRef, useState`).

## Behavior / Rendering
- **Uncontrolled internally to keep the caret stable:** a `useEffect([value])` writes `plainTextToHtml(value)` into `el.innerHTML` only when it diverges from the DOM (e.g. loading a different record), avoiding a caret reset on every keystroke.
- `emit()` reads `el.innerHTML`, updates `empty`, and calls `onChange` — wired to `onInput`.
- `exec(command, arg?)` focuses the editor, runs `document.execCommand`, then emits. Toolbar buttons use `onMouseDown` with `preventDefault` (not `onClick`) so the editor keeps its selection.
- `makeLink()` prompts for a URL; empty → `unlink`; otherwise prepends `https://` unless it already starts with `http(s):`/`mailto:`, then `createLink`.
- `onPaste` prevents default and inserts sanitized HTML (`sanitizeRichHtml` of `text/html`) or `plainTextToHtml(text/plain)` via `insertHTML` — never raw clipboard markup.
- Toolbar groups (separated by dividers): inline (bold/italic/underline/strikethrough), block (H3 heading, bullet/numbered lists, blockquote, `PRE` code), and link/clear (clear = `removeFormat` then `formatBlock` P).
- Editor `<div>` is `role="textbox" aria-multiline` with `rich-content` styling, `min-h-[96px] max-h-[40vh]` scroll; placeholder overlay shown when `empty && placeholder`.

## Data structures / Types / Constants
- `type Cmd = { icon: React.ElementType; label: string; run: () => void }`; `groups: Cmd[][]`.

## Relationships
- No contexts. Write-side counterpart to `RichText`; shares `@/lib/richText` and the `rich-content` class. Used in product/activity/changelog description forms.

## Edge cases & known limitations
- Relies on the deprecated `document.execCommand` API (broadly supported but legacy); formatting fidelity depends on the browser.
- `window.prompt` is used for link entry (blocking, minimal UX).
- Being internally uncontrolled, rapid external `value` swaps only sync when the incoming HTML differs from current DOM.
