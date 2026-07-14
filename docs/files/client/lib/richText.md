# `client/src/lib/richText.ts`
**Purpose:** Rich-text helpers for description fields — sanitizes untrusted HTML (DOMPurify) with a deliberately small allowlist, flattens HTML to plain text for previews, detects/normalizes legacy plain text vs HTML, and reports empty content.
**Language / Size:** TypeScript / 3292 bytes

## Exports
- `sanitizeRichHtml(html: string): string` — sanitize untrusted rich-text HTML.
- `looksLikeHtml(value: string): boolean` — heuristic HTML detection.
- `htmlToPlainText(value: string): string` — flatten HTML to readable plain text.
- `isRichTextEmpty(value?: string | null): boolean` — true when content renders as nothing.
- `plainTextToHtml(value: string): string` — promote legacy plain text to minimal HTML.

## API / Signature
See exports; all pure string→string/boolean transforms.

## Imports (Internal / External)
Internal: none.
External: `dompurify` (default import `DOMPurify`).

## Behavior / Implementation
- **`sanitizeRichHtml`**: empty input → `''`. Calls `ensureHook()` then `DOMPurify.sanitize` with `ALLOWED_TAGS`, `ALLOWED_ATTR`, and a custom `ALLOWED_URI_REGEXP` (permits `https`, `http`, `mailto`, relative/anchor-style URIs).
- **`ensureHook`** (idempotent, guarded by `hookInstalled` and `typeof window`): registers an `afterSanitizeAttributes` hook forcing every `<a>` to `target="_blank"` and `rel="noopener noreferrer nofollow"` (tabnabbing defense).
- **`looksLikeHtml`**: regex `/<\/?[a-z][\s\S]*>/i` — presence of tag-like markup.
- **`htmlToPlainText`**: empty → `''`; non-HTML → returned as-is. Otherwise converts `<br>`→space, closing block tags (`p|div|li|h1-6|blockquote`)→space, `<li>`→` • `, strips remaining tags, `decodeEntities`, collapses whitespace, trims. Regex-based (no DOM) so it's cheap per table row.
- **`decodeEntities`**: decodes numeric (`&#nn;`, `&#xnn;`) and a small `NAMED_ENTITIES` set; unknown named entities pass through unchanged.
- **`isRichTextEmpty`**: `true` for falsy input or when `htmlToPlainText(value).length === 0` (catches `"<p></p>"` etc.).
- **`plainTextToHtml`**: empty → `''`; already-HTML → returned untouched; else `escapeHtml` then newline (`\r?\n`) → `<br>`.
- **`escapeHtml`**: escapes `&`, `<`, `>`.

## Data structures / Types / Constants
- `ALLOWED_TAGS`: `p, br, b, strong, i, em, u, s, strike, ul, ol, li, h3, h4, blockquote, code, pre, a, span`.
- `ALLOWED_ATTR`: `href, target, rel`.
- `NAMED_ENTITIES`: `&nbsp; &amp; &lt; &gt; &quot; &#39; &apos;`.
- Module flag `hookInstalled` (one-time DOMPurify hook registration).

## Relationships
- Used wherever rich-text descriptions are stored/rendered (activity/version/product descriptions, editors, table cells, meta/preview text). Pairs a sanitize-on-render/store path with plain-text flattening for previews.

## Edge cases & known limitations
- `ensureHook` no-ops when `window` is undefined (SSR); the sanitize call itself still relies on DOMPurify's environment.
- The DOMPurify link hook is global (module-wide) — once installed it affects all `sanitize` calls in the app, forcing `_blank`/`noopener` on every anchor.
- `htmlToPlainText`/`looksLikeHtml` are regex heuristics, not a parser — unusual markup edge cases may flatten imperfectly.
- Only the listed named entities are decoded; others remain encoded in plain-text output.
