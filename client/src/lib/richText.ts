import DOMPurify from 'dompurify';

// Tags/attributes allowed in stored & rendered rich-text descriptions. Kept
// deliberately small: enough for clean formatting, nothing that can carry
// scripts, styles, or layout-breaking markup.
const ALLOWED_TAGS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'h3', 'h4', 'blockquote', 'code', 'pre', 'a', 'span',
];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

// Force every link to open safely in a new tab (defends against tabnabbing).
let hookInstalled = false;
function ensureHook() {
  if (hookInstalled || typeof window === 'undefined') return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
  hookInstalled = true;
}

/** Sanitize untrusted rich-text HTML for safe rendering / storage. */
export function sanitizeRichHtml(html: string): string {
  if (!html) return '';
  ensureHook();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/** Heuristic: does this string contain HTML markup (vs. legacy plain text)? */
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

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

/**
 * Flatten rich-text HTML to readable plain text — for truncated table cells,
 * previews, meta tags, and anywhere a single run of text is needed. Regex-based
 * (no DOM nodes) so it stays cheap when called per row.
 */
export function htmlToPlainText(value: string): string {
  if (!value) return '';
  if (!looksLikeHtml(value)) return value;
  const withBreaks = value
    .replace(/<\s*br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, ' ')
    .replace(/<li[^>]*>/gi, ' • ');
  const stripped = withBreaks.replace(/<[^>]+>/g, '');
  return decodeEntities(stripped).replace(/\s+/g, ' ').trim();
}

/** True when the content renders as nothing (e.g. an empty "<p></p>"). */
export function isRichTextEmpty(value?: string | null): boolean {
  if (!value) return true;
  return htmlToPlainText(value).length === 0;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Promote legacy plain text (possibly with newlines) to minimal HTML so the
 * editor and renderer treat new and old content uniformly. Already-HTML values
 * are returned untouched.
 */
export function plainTextToHtml(value: string): string {
  if (!value) return '';
  if (looksLikeHtml(value)) return value;
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}
