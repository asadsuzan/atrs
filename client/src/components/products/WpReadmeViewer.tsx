import { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface Props {
  content: string;
}

/**
 * Parse WP.org readme.txt format and render it as styled HTML.
 *
 * Handles:
 * - Header metadata block (Contributors, Tags, Requires, etc.)
 * - == Section == headings (h2)
 * - = Sub-section = headings (h3)
 * - * bullet list items
 * - **bold** text
 * - `code` inline
 * - [links](url)
 */
function parseWpReadme(raw: string): string {
  const lines = raw.split('\n');
  const html: string[] = [];
  let inList = false;
  let headerParsed = false;
  const headerFields: { key: string; value: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // === Plugin Name === (title line — skip, shown in product header)
    if (/^===\s+.+\s+===$/.test(line.trim())) {
      continue;
    }

    // Header metadata block (key: value lines before first == section ==)
    if (!headerParsed && /^[A-Z][A-Za-z ]+:/.test(line.trim())) {
      const colonIdx = line.indexOf(':');
      headerFields.push({
        key: line.slice(0, colonIdx).trim(),
        value: line.slice(colonIdx + 1).trim(),
      });
      continue;
    }

    // Flush header when we hit the first == section ==
    if (!headerParsed && /^==\s+.+\s+==$/.test(line.trim())) {
      headerParsed = true;
      if (headerFields.length > 0) {
        html.push('<div class="wp-readme-meta">');
        for (const f of headerFields) {
          html.push(`<div class="wp-readme-meta-row"><span class="wp-readme-meta-key">${esc(f.key)}</span><span class="wp-readme-meta-value">${esc(f.value)}</span></div>`);
        }
        html.push('</div>');
      }
    }

    // Mark header as parsed if we encounter any non-empty, non-header line
    if (!headerParsed && line.trim() !== '' && !/^[A-Z][A-Za-z ]+:/.test(line.trim())) {
      headerParsed = true;
      if (headerFields.length > 0) {
        html.push('<div class="wp-readme-meta">');
        for (const f of headerFields) {
          html.push(`<div class="wp-readme-meta-row"><span class="wp-readme-meta-key">${esc(f.key)}</span><span class="wp-readme-meta-value">${esc(f.value)}</span></div>`);
        }
        html.push('</div>');
      }
    }

    // == Section Heading ==
    if (/^==\s+(.+)\s+==$/.test(line.trim())) {
      if (inList) { html.push('</ul>'); inList = false; }
      const title = line.trim().replace(/^==\s+/, '').replace(/\s+==$/, '');
      html.push(`<h2 class="wp-readme-h2">${esc(title)}</h2>`);
      continue;
    }

    // = Sub Heading =
    if (/^=\s+(.+)\s+=$/.test(line.trim())) {
      if (inList) { html.push('</ul>'); inList = false; }
      const title = line.trim().replace(/^=\s+/, '').replace(/\s+=$/, '');
      html.push(`<h3 class="wp-readme-h3">${esc(title)}</h3>`);
      continue;
    }

    // Bullet list item: * text or - text
    if (/^\s*[\*\-]\s+/.test(line)) {
      if (!inList) { html.push('<ul class="wp-readme-list">'); inList = true; }
      const text = line.replace(/^\s*[\*\-]\s+/, '');
      html.push(`<li>${inline(text)}</li>`);
      continue;
    }

    // Empty line — close list, add spacer
    if (line.trim() === '') {
      if (inList) { html.push('</ul>'); inList = false; }
      continue;
    }

    // Regular paragraph text
    if (inList) { html.push('</ul>'); inList = false; }
    html.push(`<p class="wp-readme-p">${inline(line)}</p>`);
  }

  if (inList) html.push('</ul>');
  return html.join('\n');
}

/** Escape HTML entities. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Process inline formatting: **bold**, `code`, [text](url). */
function inline(text: string): string {
  let s = esc(text);
  // **bold**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // `code`
  s = s.replace(/`([^`]+)`/g, '<code class="wp-readme-code">$1</code>');
  // [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return s;
}

export function WpReadmeViewer({ content }: Props) {
  const htmlContent = useMemo(() => {
    const raw = parseWpReadme(content);
    return DOMPurify.sanitize(raw);
  }, [content]);

  return (
    <div className="wp-readme-viewer">
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />

      <style>{`
        .wp-readme-viewer {
          max-width: 800px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.7;
          color: hsl(var(--foreground));
        }

        .wp-readme-meta {
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          padding: 16px 20px;
          margin-bottom: 24px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 24px;
        }

        .wp-readme-meta-row {
          display: flex;
          gap: 8px;
        }

        .wp-readme-meta-key {
          font-weight: 600;
          font-size: 13px;
          color: hsl(var(--muted-foreground));
          white-space: nowrap;
        }

        .wp-readme-meta-key::after {
          content: ':';
        }

        .wp-readme-meta-value {
          font-size: 13px;
          color: hsl(var(--foreground));
        }

        .wp-readme-h2 {
          font-size: 1.4rem;
          font-weight: 700;
          margin: 32px 0 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
        }

        .wp-readme-h2:first-child {
          margin-top: 0;
        }

        .wp-readme-h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 20px 0 8px;
          color: hsl(var(--foreground));
        }

        .wp-readme-p {
          margin: 8px 0;
          font-size: 14px;
          color: hsl(var(--muted-foreground));
        }

        .wp-readme-list {
          margin: 8px 0 16px;
          padding-left: 24px;
        }

        .wp-readme-list li {
          font-size: 14px;
          margin: 4px 0;
          color: hsl(var(--muted-foreground));
          line-height: 1.6;
        }

        .wp-readme-list li::marker {
          color: hsl(var(--primary));
        }

        .wp-readme-list li strong {
          color: hsl(var(--foreground));
        }

        .wp-readme-code {
          background: hsl(var(--muted));
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-family: 'Fira Code', 'JetBrains Mono', monospace;
        }

        .wp-readme-viewer a {
          color: hsl(var(--primary));
          text-decoration: none;
        }

        .wp-readme-viewer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
