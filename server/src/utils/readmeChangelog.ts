export type ChangelogType = 'feature' | 'improvement' | 'bug-fix';

export interface ParsedChangelogItem {
  title: string;
  type: ChangelogType;
}

export interface ParsedChangelogVersion {
  version: string;
  releasedAt: Date | null;
  items: ParsedChangelogItem[];
}

/** Maps a leading keyword to one of our activity types (null = unknown). */
function keywordType(kw: string): ChangelogType | null {
  const k = kw.toLowerCase();
  if (/^(new|add|added|adds|feature|features|introduce|introduced|implement|implemented)$/.test(k)) return 'feature';
  if (/^(fix|fixed|fixes|bug|bugfix|hotfix|patch|patched|resolve|resolved|correct|corrected)$/.test(k)) return 'bug-fix';
  if (/^(update|updated|updates|improve|improved|improvement|enhance|enhanced|enhancement|change|changed|tweak|tweaked|optimize|optimized|optimise|optimised|refactor|refactored|perf|performance|security|compat|compatibility|dev|deprecate|deprecated)$/.test(k)) return 'improvement';
  return null;
}

/** Classifies a single change line into a type + cleaned title. */
function classify(line: string): ParsedChangelogItem {
  // Strip list markers (*, -, •) and surrounding whitespace.
  const title = line.replace(/^[\s*\-•·]+/, '').trim();

  // "Prefix: rest" / "Prefix - rest" where Prefix is a single known keyword.
  const label = title.match(/^([A-Za-z]+)\s*[:\-–—]\s*(.+)$/);
  if (label) {
    const t = keywordType(label[1]);
    if (t) return { type: t, title: label[2].trim() };
  }

  // Otherwise infer from the first word but keep the full text as the title.
  const firstWord = (title.match(/^([A-Za-z]+)/)?.[1]) || '';
  return { type: keywordType(firstWord) || 'improvement', title };
}

/** Parses a date string like "4 June 2026", "June 4, 2026", "2026-06-04". */
function parseDate(s: string): Date | null {
  if (!s) return null;
  const cleaned = s.replace(/(\d+)(st|nd|rd|th)/gi, '$1').replace(/[()]/g, '').trim();
  if (!cleaned) return null;
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * A version heading is either WordPress style `= 2.1.0 - 4 June 2026 =`
 * (single/double equals) or a bare line `2.1.0 - 4 June 2026`. Returns the
 * version token and parsed date, or null if the line isn't a version heading.
 */
function parseVersionHeader(line: string): { version: string; date: Date | null } | null {
  let inner: string | null = null;
  const eq = line.match(/^=+\s*(.*?)\s*=+$/);
  if (eq) {
    inner = eq[1].trim();
  } else if (/^v?\d+(\.\d+)+(\s*[-–—(:].*)?$/i.test(line)) {
    inner = line.trim();
  }
  if (!inner) return null;

  // inner: "2.1.0 - 4 June 2026" | "2.1.0" | "v2.1.0 (2026-06-04)"
  const m = inner.match(/^v?\s*([0-9][\w.]*?)\s*(?:[-–—(:]\s*(.+?)\)?\s*)?$/i);
  if (!m) return null;
  return { version: m[1], date: m[2] ? parseDate(m[2]) : null };
}

/**
 * Parses the `== Changelog ==` section of a WordPress readme.txt into a list of
 * versions, each with its release date and classified change items.
 */
export function parseReadmeChangelog(readme: string): ParsedChangelogVersion[] {
  if (!readme) return [];
  const lines = readme.split(/\r?\n/);

  // Locate the Changelog section (up to the next top-level `== ... ==` heading).
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*==+\s*change\s*log\s*==+/i.test(lines[i])) { start = i + 1; break; }
  }
  if (start === -1) return [];

  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (/^\s*==[^=].*==\s*$/.test(lines[i]) || /^\s*==\s/.test(lines[i])) { end = i; break; }
  }

  const blocks: ParsedChangelogVersion[] = [];
  let current: ParsedChangelogVersion | null = null;

  for (const raw of lines.slice(start, end)) {
    const line = raw.trim();
    if (!line) continue;

    const isHeading = /^=/.test(line) || /^v?\d+(\.\d+)+(\s*[-–—(:].*)?$/i.test(line);
    if (isHeading) {
      const h = parseVersionHeader(line);
      current = h ? { version: h.version, releasedAt: h.date, items: [] } : null;
      if (current) blocks.push(current);
      continue;
    }

    if (!current) continue;
    const item = classify(line);
    if (item.title) current.items.push(item);
  }

  // Drop empty version blocks.
  return blocks.filter((b) => b.items.length > 0);
}
