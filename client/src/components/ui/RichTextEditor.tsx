import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Link2, Code, Quote, Heading, Eraser,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeRichHtml, plainTextToHtml, isRichTextEmpty } from '@/lib/richText';

type Cmd = { icon: React.ElementType; label: string; run: () => void };

/**
 * Lightweight rich-text editor for description fields. Built on contentEditable
 * (no heavy editor runtime), sanitized via DOMPurify on paste and on every
 * change so stored content is always safe. Uncontrolled internally to keep the
 * caret stable; syncs from `value` only when it changes externally.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [empty, setEmpty] = useState(isRichTextEmpty(value));

  // Sync external value into the DOM only when it diverges (e.g. opening a
  // different record for edit). Avoids resetting the caret on every keystroke.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const incoming = plainTextToHtml(value || '');
    if (incoming !== el.innerHTML) {
      el.innerHTML = incoming;
      setEmpty(isRichTextEmpty(el.innerHTML));
    }
  }, [value]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEmpty(isRichTextEmpty(el.innerHTML));
    onChange(el.innerHTML);
  }, [onChange]);

  const exec = useCallback((command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  }, [emit]);

  const makeLink = useCallback(() => {
    const url = window.prompt('Link URL');
    if (url === null) return;
    if (url.trim() === '') { exec('unlink'); return; }
    const href = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
    exec('createLink', href);
  }, [exec]);

  // Paste as sanitized HTML (or plain text) — never raw clipboard markup.
  const onPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    const insert = html ? sanitizeRichHtml(html) : plainTextToHtml(text);
    document.execCommand('insertHTML', false, insert);
    emit();
  }, [emit]);

  const groups: Cmd[][] = [
    [
      { icon: Bold, label: 'Bold', run: () => exec('bold') },
      { icon: Italic, label: 'Italic', run: () => exec('italic') },
      { icon: Underline, label: 'Underline', run: () => exec('underline') },
      { icon: Strikethrough, label: 'Strikethrough', run: () => exec('strikeThrough') },
    ],
    [
      { icon: Heading, label: 'Heading', run: () => exec('formatBlock', 'H3') },
      { icon: List, label: 'Bullet list', run: () => exec('insertUnorderedList') },
      { icon: ListOrdered, label: 'Numbered list', run: () => exec('insertOrderedList') },
      { icon: Quote, label: 'Quote', run: () => exec('formatBlock', 'BLOCKQUOTE') },
      { icon: Code, label: 'Code', run: () => exec('formatBlock', 'PRE') },
    ],
    [
      { icon: Link2, label: 'Link', run: makeLink },
      { icon: Eraser, label: 'Clear formatting', run: () => { exec('removeFormat'); exec('formatBlock', 'P'); } },
    ],
  ];

  return (
    <div
      className={cn(
        'rounded-lg border border-input bg-transparent shadow-sm transition-all duration-150',
        focused && 'ring-2 ring-ring/60 border-ring/60',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1">
        {groups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <span className="mx-1 h-5 w-px bg-border" aria-hidden />}
            {group.map(({ icon: Icon, label, run }) => (
              <button
                key={label}
                type="button"
                title={label}
                aria-label={label}
                // onMouseDown (not onClick) so the editor keeps its selection.
                onMouseDown={(e) => { e.preventDefault(); run(); }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="relative">
        {empty && placeholder && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel || placeholder}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onPaste={onPaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="rich-content min-h-[96px] max-h-[40vh] overflow-y-auto w-full px-3 py-2 text-sm leading-relaxed focus:outline-none"
        />
      </div>
    </div>
  );
}
