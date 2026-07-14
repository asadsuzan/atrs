# `server/src/utils/html.ts`
**Purpose:** Regex-based HTML/text conversion helpers (no DOM): convert stored rich-text HTML to plain text for exports, escape untrusted text, and turn plain text into safe display HTML.
**Language / Size:** TypeScript / 2200 bytes

## Exports
- `function htmlToText(input: string): string`
- `function htmlToInlineText(input: string): string`
- `function escapeHtml(input: string): string`
- `function plainTextToSafeHtml(input: string): string`

## Imports (Internal / External)
- None.

## Functions / Methods
### `decodeEntities(text)` (private)
Decodes numeric decimal entities (`&#NN;` via `String.fromCharCode`), numeric hex entities (`&#xNN;` via `parseInt(...,16)`), and a small set of named entities from `NAMED_ENTITIES`; unknown named entities are left unchanged.

### `looksLikeHtml(value)` (private)
Returns true if the string matches `/<\/?[a-z][\s\S]*>/i` (contains an opening/closing tag).

### `htmlToText(input)`
Block-aware HTML→text. Returns `''` for falsy input; returns input unchanged if it doesn't look like HTML. Otherwise: converts `<br>` to `\n`, `<li ...>` to `\n- `, closing block tags (`p`, `div`, `h1`–`h6`, `blockquote`, `ul`, `ol`, `pre`, `li`) to `\n`, strips all remaining tags, decodes entities, then normalizes whitespace (collapse spaces/tabs, trim spaces around newlines, collapse 3+ newlines to 2) and trims.

### `htmlToInlineText(input)`
Runs `htmlToText` then collapses all whitespace to single spaces and trims — for single-line/inline contexts.

### `escapeHtml(input)`
Escapes the five HTML-significant characters: `&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;`, `"`→`&quot;`, `'`→`&#39;` (ampersand first to avoid double-escaping).

### `plainTextToSafeHtml(input)`
Escapes all markup via `escapeHtml`, then converts line breaks (`\r\n`, `\r`, `\n`) to `<br>`. Used to safely render public-submitted issue descriptions as HTML.

## Data structures / Types / Constants
- `NAMED_ENTITIES`: map of `&nbsp; &amp; &lt; &gt; &quot; &#39; &apos;` to their characters.

## Important algorithms
Purely regex-driven so it runs without a DOM in Node. Block-level tags become newlines and list items become `- ` bullets, approximating Markdown-ish plain text.

## Relationships
Consumed by `releaseFormat.ts` (`htmlToText`/`htmlToInlineText`) for changelog/Markdown exports. `escapeHtml`/`plainTextToSafeHtml` used where untrusted text is rendered as HTML (e.g. public issue pages).

## Edge cases & known limitations
- Regex-based, not a real parser: malformed or exotic HTML may convert imperfectly.
- Only the listed named entities are decoded; others pass through verbatim.
- `htmlToText` returns non-HTML input unchanged (no escaping/decoding applied in that branch).
