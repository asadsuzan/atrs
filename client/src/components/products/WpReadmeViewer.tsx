import { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Download, Star } from 'lucide-react';

interface WpSections {
  [key: string]: string;
}

interface WpData {
  name?: string;
  version?: string;
  author?: string;
  author_profile?: string;
  last_updated?: string;
  active_installs?: number;
  requires?: string;
  tested?: string;
  requires_php?: string;
  rating?: number; // 0–100
  num_ratings?: number;
  ratings?: Record<string, number>; // { "5": n, ... }
  downloaded?: number;
  download_link?: string;
  tags?: Record<string, string>;
  contributors?: Record<string, { profile?: string; avatar?: string; display_name?: string }>;
  sections?: WpSections;
  short_description?: string;
}

interface Props {
  /** Raw readme.txt contents (fallback / primary parse source). */
  content: string;
  /** Optional live data from the WordPress.org plugins API to enrich the view. */
  wpData?: WpData | null;
}

interface ParsedSection {
  id: string;
  title: string;
  /** Rendered HTML string. */
  html: string;
}

interface ParsedReadme {
  meta: Record<string, string>;
  shortDescription: string;
  sections: ParsedSection[];
}

/** Escape HTML entities. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Process inline formatting: **bold**, `code`, [text](url). */
function inline(text: string): string {
  let s = esc(text);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/`([^`]+)`/g, '<code class="wporg-code">$1</code>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return s;
}

/** Render a block of body lines (within one section) to HTML. */
function renderBlocks(lines: string[]): string {
  const out: string[] = [];
  let listMode: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (listMode) {
      out.push(listMode === 'ul' ? '</ul>' : '</ol>');
      listMode = null;
    }
  };

  for (const raw of lines) {
    const line = raw;

    // = Sub heading = (FAQ questions, changelog versions, etc.)
    if (/^=\s+(.+?)\s+=$/.test(line.trim())) {
      closeList();
      const title = line.trim().replace(/^=\s+/, '').replace(/\s+=$/, '');
      out.push(`<h3 class="wporg-h3">${inline(title)}</h3>`);
      continue;
    }

    // Ordered list: "1. text"
    if (/^\s*\d+\.\s+/.test(line)) {
      if (listMode !== 'ol') { closeList(); out.push('<ol class="wporg-list">'); listMode = 'ol'; }
      out.push(`<li>${inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`);
      continue;
    }

    // Unordered list: "* text" or "- text"
    if (/^\s*[\*\-]\s+/.test(line)) {
      if (listMode !== 'ul') { closeList(); out.push('<ul class="wporg-list">'); listMode = 'ul'; }
      out.push(`<li>${inline(line.replace(/^\s*[\*\-]\s+/, ''))}</li>`);
      continue;
    }

    // Blank line ends a list and adds spacing.
    if (line.trim() === '') {
      closeList();
      continue;
    }

    closeList();
    out.push(`<p class="wporg-p">${inline(line)}</p>`);
  }

  closeList();
  return out.join('\n');
}

/** Parse a raw readme.txt into header meta, short description, and sections. */
function parseReadme(raw: string): ParsedReadme {
  const lines = raw.split('\n');
  const meta: Record<string, string> = {};
  const shortDescLines: string[] = [];
  const sections: { title: string; lines: string[] }[] = [];

  let i = 0;

  // Skip the === Plugin Name === title line.
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && /^===\s+.+\s+===$/.test(lines[i].trim())) i++;

  // Header metadata block: "Key: value" lines until a blank line or first section.
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === '') { i++; break; }
    if (/^==\s+.+\s+==$/.test(t)) break;
    const m = t.match(/^([A-Z][A-Za-z0-9 ]+):\s*(.*)$/);
    if (m) { meta[m[1].trim()] = m[2].trim(); } else break;
  }

  // Short description: free text until the first == Section ==.
  for (; i < lines.length; i++) {
    if (/^==\s+.+\s+==$/.test(lines[i].trim())) break;
    if (lines[i].trim() !== '') shortDescLines.push(lines[i].trim());
  }

  // Sections.
  let current: { title: string; lines: string[] } | null = null;
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    const m = t.match(/^==\s+(.+?)\s+==$/);
    if (m) {
      current = { title: m[1], lines: [] };
      sections.push(current);
      continue;
    }
    if (current) current.lines.push(lines[i]);
  }

  return {
    meta,
    shortDescription: shortDescLines.join(' '),
    sections: sections.map((s) => ({
      id: slug(s.title),
      title: s.title,
      html: renderBlocks(s.lines),
    })),
  };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function titleCase(s: string): string {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Preferred display order for sections (WP.org ordering). */
const SECTION_ORDER = ['description', 'installation', 'faq', 'frequently-asked-questions', 'screenshots', 'changelog', 'reviews', 'upgrade-notice'];

function orderSections(sections: ParsedSection[]): ParsedSection[] {
  return [...sections].sort((a, b) => {
    const ia = SECTION_ORDER.indexOf(a.id);
    const ib = SECTION_ORDER.indexOf(b.id);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function formatInstalls(n?: number): string | null {
  if (!n && n !== 0) return null;
  return `${n.toLocaleString()}+ active installations`;
}

function timeAgo(dateStr?: string): string | null {
  if (!dateStr) return null;
  // WP.org returns e.g. "2026-06-01 9:12am GMT" — keep just the date portion.
  return dateStr.replace(/\s+\d{1,2}:\d{2}(am|pm)?\s*GMT$/i, '');
}

export function WpReadmeViewer({ content, wpData }: Props) {
  // Build the section list: prefer WP.org's own rendered section HTML, else parse readme.txt.
  const parsed = useMemo(() => parseReadme(content || ''), [content]);

  const sections = useMemo<ParsedSection[]>(() => {
    if (wpData?.sections && Object.keys(wpData.sections).length > 0) {
      const built = Object.entries(wpData.sections)
        .filter(([key]) => key !== 'reviews') // reviews is huge/HTML-heavy; skip for the embedded view
        .map(([key, html]) => ({
          id: slug(key),
          title: titleCase(key === 'faq' ? 'FAQ' : key),
          html: DOMPurify.sanitize(html || ''),
        }));
      return orderSections(built);
    }
    return orderSections(parsed.sections.map((s) => ({ ...s, html: DOMPurify.sanitize(s.html) })));
  }, [wpData, parsed]);

  const [active, setActive] = useState(0);
  // Reset to first tab if section set changes and index is out of range.
  const activeIdx = active < sections.length ? active : 0;

  // --- Sidebar meta (wpData takes precedence over parsed header) ---
  const stars = wpData?.rating != null ? (wpData.rating / 20) : null; // 0–100 -> 0–5
  const tags: { label: string; href?: string }[] = wpData?.tags
    ? Object.entries(wpData.tags).map(([s2, label]) => ({ label, href: `https://wordpress.org/plugins/tags/${s2}/` }))
    : (parsed.meta['Tags'] || '').split(',').map((t) => t.trim()).filter(Boolean).map((label) => ({ label }));

  const metaRows: { label: string; value: string }[] = [];
  const pushMeta = (label: string, value?: string | null) => {
    if (value) metaRows.push({ label, value });
  };
  pushMeta('Version', wpData?.version || parsed.meta['Stable tag']);
  pushMeta('Last updated', timeAgo(wpData?.last_updated));
  pushMeta('Active installations', formatInstalls(wpData?.active_installs));
  pushMeta('WordPress version', wpData?.requires || parsed.meta['Requires at least']);
  pushMeta('Tested up to', wpData?.tested || parsed.meta['Tested up to']);
  pushMeta('PHP version', wpData?.requires_php || parsed.meta['Requires PHP']);

  const contributors = wpData?.contributors
    ? Object.entries(wpData.contributors).map(([username, c]) => ({
        username,
        name: c.display_name || username,
        avatar: c.avatar,
        profile: c.profile,
      }))
    : (parsed.meta['Contributors'] || '').split(',').map((c) => c.trim()).filter(Boolean).map((username) => ({
        username,
        name: username,
        avatar: undefined as string | undefined,
        profile: `https://profiles.wordpress.org/${username}/`,
      }));

  // Ratings breakdown bars (5 -> 1).
  const ratingsBreakdown = wpData?.ratings
    ? [5, 4, 3, 2, 1].map((n) => ({ n, count: wpData.ratings?.[String(n)] || 0 }))
    : null;
  const maxRatingCount = ratingsBreakdown ? Math.max(1, ...ratingsBreakdown.map((r) => r.count)) : 1;

  if (sections.length === 0) {
    return <div className="text-muted-foreground text-sm">No readme content available.</div>;
  }

  return (
    <div className="wporg-readme">
      <div className="wporg-grid">
        {/* Main column */}
        <div className="wporg-main">
          {parsed.shortDescription && activeIdx === 0 && (
            <p className="wporg-tagline">{parsed.shortDescription}</p>
          )}

          {/* Section tab navigation */}
          <nav className="wporg-tabs" aria-label="Readme sections">
            {sections.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                className={`wporg-tab ${idx === activeIdx ? 'is-active' : ''}`}
                onClick={() => setActive(idx)}
              >
                {s.title}
              </button>
            ))}
          </nav>

          <article
            className="wporg-content"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: sections[activeIdx].html }}
          />
        </div>

        {/* Sidebar */}
        <aside className="wporg-sidebar">
          {wpData?.download_link && (
            <a className="wporg-download" href={wpData.download_link} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4" />
              Download {wpData.version ? `v${wpData.version}` : ''}
            </a>
          )}

          {(stars != null || metaRows.length > 0) && (
            <div className="wporg-card">
              {stars != null && (
                <div className="wporg-rating">
                  <div className="wporg-stars" aria-label={`${stars.toFixed(1)} out of 5 stars`}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star
                        key={i}
                        className="w-4 h-4"
                        fill={i < Math.round(stars) ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                  {wpData?.num_ratings != null && (
                    <span className="wporg-rating-count">
                      {wpData.num_ratings.toLocaleString()} {wpData.num_ratings === 1 ? 'review' : 'reviews'}
                    </span>
                  )}
                </div>
              )}

              {ratingsBreakdown && wpData?.num_ratings ? (
                <div className="wporg-bars">
                  {ratingsBreakdown.map((r) => (
                    <div className="wporg-bar-row" key={r.n}>
                      <span className="wporg-bar-label">{r.n} stars</span>
                      <span className="wporg-bar-track">
                        <span className="wporg-bar-fill" style={{ width: `${(r.count / maxRatingCount) * 100}%` }} />
                      </span>
                      <span className="wporg-bar-count">{r.count}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {metaRows.length > 0 && (
                <dl className="wporg-meta">
                  {metaRows.map((row) => (
                    <div className="wporg-meta-row" key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          {tags.length > 0 && (
            <div className="wporg-card">
              <h4 className="wporg-card-title">Tags</h4>
              <div className="wporg-tag-list">
                {tags.map((t) =>
                  t.href ? (
                    <a key={t.label} className="wporg-chip" href={t.href} target="_blank" rel="noopener noreferrer">
                      {t.label}
                    </a>
                  ) : (
                    <span key={t.label} className="wporg-chip">{t.label}</span>
                  )
                )}
              </div>
            </div>
          )}

          {contributors.length > 0 && (
            <div className="wporg-card">
              <h4 className="wporg-card-title">Contributors</h4>
              <div className="wporg-contributors">
                {contributors.map((c) => (
                  <a
                    key={c.username}
                    className="wporg-contributor"
                    href={c.profile || `https://profiles.wordpress.org/${c.username}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={c.name}
                  >
                    {c.avatar ? (
                      <img src={c.avatar} alt={c.name} />
                    ) : (
                      <span className="wporg-contributor-fallback">{c.name.slice(0, 2).toUpperCase()}</span>
                    )}
                    <span>{c.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <style>{`
        .wporg-readme {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: hsl(var(--foreground));
          --wporg-accent: #2271b1;
        }
        :root .dark .wporg-readme, .dark .wporg-readme { --wporg-accent: #5b9dd9; }

        .wporg-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 40px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .wporg-grid { grid-template-columns: 1fr; }
        }

        /* --- Main column --- */
        .wporg-tagline {
          font-size: 15px;
          line-height: 1.6;
          color: hsl(var(--muted-foreground));
          margin: 0 0 20px;
          padding-left: 14px;
          border-left: 3px solid var(--wporg-accent);
        }

        .wporg-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          border-bottom: 1px solid hsl(var(--border));
          margin-bottom: 24px;
        }
        .wporg-tab {
          appearance: none;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 600;
          color: hsl(var(--muted-foreground));
          cursor: pointer;
          margin-bottom: -1px;
          transition: color .15s, border-color .15s;
        }
        .wporg-tab:hover { color: hsl(var(--foreground)); }
        .wporg-tab.is-active {
          color: var(--wporg-accent);
          border-bottom-color: var(--wporg-accent);
        }

        .wporg-content { max-width: 760px; }
        .wporg-content h1, .wporg-content h2 {
          font-size: 1.35rem;
          font-weight: 700;
          margin: 28px 0 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid hsl(var(--border));
        }
        .wporg-content h1:first-child, .wporg-content h2:first-child { margin-top: 0; }
        .wporg-h3, .wporg-content h3, .wporg-content h4 {
          font-size: 1.05rem;
          font-weight: 600;
          margin: 22px 0 8px;
          color: hsl(var(--foreground));
        }
        .wporg-p, .wporg-content p {
          margin: 10px 0;
          font-size: 14px;
          line-height: 1.7;
          color: hsl(var(--muted-foreground));
        }
        .wporg-list, .wporg-content ul, .wporg-content ol {
          margin: 10px 0 16px;
          padding-left: 24px;
        }
        .wporg-list li, .wporg-content li {
          font-size: 14px;
          line-height: 1.7;
          margin: 4px 0;
          color: hsl(var(--muted-foreground));
        }
        .wporg-list li::marker, .wporg-content li::marker { color: var(--wporg-accent); }
        .wporg-content strong { color: hsl(var(--foreground)); }
        .wporg-code, .wporg-content code {
          background: hsl(var(--muted));
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-family: 'Fira Code', 'JetBrains Mono', monospace;
        }
        .wporg-content pre {
          background: hsl(var(--muted));
          padding: 14px 16px;
          border-radius: 8px;
          overflow-x: auto;
          font-size: 12.5px;
          margin: 14px 0;
        }
        .wporg-content pre code { background: none; padding: 0; }
        .wporg-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; }
        .wporg-readme a { color: var(--wporg-accent); text-decoration: none; }
        .wporg-readme a:hover { text-decoration: underline; }
        .wporg-content blockquote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 14px;
          margin: 14px 0;
          color: hsl(var(--muted-foreground));
        }

        /* --- Sidebar --- */
        .wporg-sidebar { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 16px; }
        .wporg-download {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--wporg-accent);
          color: #fff !important;
          font-weight: 600;
          font-size: 14px;
          padding: 11px 16px;
          border-radius: 8px;
          text-decoration: none !important;
          transition: opacity .15s;
        }
        .wporg-download:hover { opacity: .9; }

        .wporg-card {
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          padding: 16px 18px;
          background: hsl(var(--card));
        }
        .wporg-card-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .04em;
          color: hsl(var(--muted-foreground));
          margin: 0 0 12px;
        }

        .wporg-rating { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .wporg-stars { display: flex; color: #f59e0b; }
        .wporg-rating-count { font-size: 13px; color: hsl(var(--muted-foreground)); }

        .wporg-bars { display: flex; flex-direction: column; gap: 5px; margin-bottom: 16px; }
        .wporg-bar-row { display: grid; grid-template-columns: 52px 1fr 28px; align-items: center; gap: 8px; }
        .wporg-bar-label { font-size: 11px; color: hsl(var(--muted-foreground)); white-space: nowrap; }
        .wporg-bar-track { height: 8px; background: hsl(var(--muted)); border-radius: 99px; overflow: hidden; }
        .wporg-bar-fill { display: block; height: 100%; background: #f59e0b; border-radius: 99px; }
        .wporg-bar-count { font-size: 11px; color: hsl(var(--muted-foreground)); text-align: right; }

        .wporg-meta { margin: 0; display: flex; flex-direction: column; }
        .wporg-meta-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 9px 0;
          border-top: 1px solid hsl(var(--border));
          font-size: 13px;
        }
        .wporg-meta-row:first-child { border-top: none; }
        .wporg-meta-row dt { color: hsl(var(--muted-foreground)); }
        .wporg-meta-row dd { margin: 0; font-weight: 600; text-align: right; }

        .wporg-tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .wporg-chip {
          font-size: 12px;
          padding: 3px 10px;
          border-radius: 99px;
          background: hsl(var(--muted));
          color: hsl(var(--muted-foreground)) !important;
          text-decoration: none !important;
          transition: background .15s;
        }
        a.wporg-chip:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)) !important; }

        .wporg-contributors { display: flex; flex-direction: column; gap: 8px; }
        .wporg-contributor {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; font-weight: 500;
          color: hsl(var(--foreground)) !important;
          text-decoration: none !important;
        }
        .wporg-contributor:hover span { color: var(--wporg-accent); }
        .wporg-contributor img, .wporg-contributor-fallback {
          width: 28px; height: 28px; border-radius: 6px; object-fit: cover; flex-shrink: 0;
        }
        .wporg-contributor-fallback {
          display: flex; align-items: center; justify-content: center;
          background: hsl(var(--muted)); color: hsl(var(--muted-foreground));
          font-size: 10px; font-weight: 700;
        }
      `}</style>
    </div>
  );
}
