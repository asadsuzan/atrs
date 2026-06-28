import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { sanitizeRichHtml, looksLikeHtml, isRichTextEmpty } from '@/lib/richText';

/**
 * Renders stored description content exactly as authored. Rich HTML is
 * sanitized then injected; legacy plain text is rendered with preserved
 * line breaks. Sanitization is memoized so re-renders stay cheap.
 */
export function RichText({
  html,
  className,
  fallback = null,
}: {
  html?: string | null;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const value = html || '';
  const isHtml = looksLikeHtml(value);
  const clean = useMemo(() => (isHtml ? sanitizeRichHtml(value) : ''), [value, isHtml]);

  if (isRichTextEmpty(value)) return <>{fallback}</>;

  if (isHtml) {
    return (
      <div
        className={cn('rich-content', className)}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }
  // Legacy plain text — keep line breaks without interpreting markup.
  return <div className={cn('rich-content whitespace-pre-wrap', className)}>{value}</div>;
}
