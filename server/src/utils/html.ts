// Convert stored rich-text HTML (from description / notes fields) back to plain
// text for plain-text outputs such as the Markdown / readme changelog export.
// Regex-based so it needs no DOM in the Node runtime.

const NAMED_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&quot;': '"', '&#39;': "'", '&apos;': "'",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z#0-9]+;/gi, (m) => NAMED_ENTITIES[m.toLowerCase()] ?? m);
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

/** Block-aware: turns block boundaries into newlines and `<li>` into "- ". */
export function htmlToText(input: string): string {
  if (!input) return '';
  if (!looksLikeHtml(input)) return input;
  const stripped = input
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n- ')
    .replace(/<\/\s*(p|div|h[1-6]|blockquote|ul|ol|pre|li)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(stripped)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Single line: collapses all whitespace (for inline contexts). */
export function htmlToInlineText(input: string): string {
  return htmlToText(input).replace(/\s+/g, ' ').trim();
}

/** Escapes the five HTML-significant characters so untrusted text is safe to render. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Turns untrusted plain text into safe display HTML: strips any markup by
 * escaping it, then preserves line breaks as <br>. Used for public-submitted
 * issue descriptions, which are rendered as HTML on the public page.
 */
export function plainTextToSafeHtml(input: string): string {
  return escapeHtml(input).replace(/\r\n|\r|\n/g, '<br>');
}
