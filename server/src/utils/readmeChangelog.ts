export type ChangelogType = 'feature' | 'improvement' | 'bug-fix';

/**
 * How sure we are about an item's classified type:
 *  - high:   an explicit "Prefix:" with a known keyword (e.g. "Fix: …")
 *  - medium: inferred from the first word being a known keyword ("Fixed …")
 *  - low:    no keyword at all — the type was defaulted (a pure guess)
 * Anything below `high` is worth a human glance, hence flagged for review.
 */
export type ClassificationConfidence = 'high' | 'medium' | 'low';

export interface ParsedChangelogItem {
  title: string;
  type: ChangelogType;
  confidence: ClassificationConfidence;
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

/** Classifies a single change line into a type + cleaned title + confidence. */
function classify(line: string): ParsedChangelogItem {
  // Strip list markers (*, -, •) and surrounding whitespace.
  const title = line.replace(/^[\s*\-•·]+/, '').trim();

  // "Prefix: rest" / "Prefix - rest" where Prefix is a single known keyword.
  // An explicit, recognised label is the strongest signal → high confidence.
  const label = title.match(/^([A-Za-z]+)\s*[:\-–—]\s*(.+)$/);
  if (label) {
    const t = keywordType(label[1]);
    if (t) return { type: t, title: label[2].trim(), confidence: 'high' };
  }

  // Otherwise infer from the first word but keep the full text as the title.
  // A first-word keyword is a reasonable guess (medium); no keyword at all
  // means we defaulted the type and can't be sure (low).
  const firstWord = (title.match(/^([A-Za-z]+)/)?.[1]) || '';
  const inferred = keywordType(firstWord);
  return {
    type: inferred || 'improvement',
    title,
    confidence: inferred ? 'medium' : 'low',
  };
}

/**
 * Canonical numeric form of a version label, used only for matching (never
 * displayed). Drops a leading "v", leading zeros and trailing zero segments so
 * a readme heading of `= 1.0 =` resolves to the SVN tag `1.0.0` instead of
 * silently importing an unversioned entry. Labels that aren't purely numeric
 * (`2.0-beta1`) fall back to a lowercased trim so they still compare stably.
 */
export function canonicalVersion(label: string): string {
  const raw = String(label ?? '').trim().replace(/^v/i, '');
  if (!/^\d+(\.\d+)*$/.test(raw)) return raw.toLowerCase();
  const parts = raw.split('.').map((n) => String(parseInt(n, 10) || 0));
  while (parts.length > 1 && parts[parts.length - 1] === '0') parts.pop();
  return parts.join('.');
}

/**
 * Normalizes a change line for duplicate detection (matching only — the stored
 * title keeps the author's original text). Strips markdown emphasis, list
 * markers and edge punctuation and collapses whitespace, so `* **Update SDK**`,
 * `Update SDK.` and `update sdk` all compare equal.
 */
export function normalizeChangelogTitle(title: string): string {
  return String(title ?? '')
    .replace(/[*_`~]+/g, ' ')
    .replace(/^[\s\-–—•·:]+/, '')
    .replace(/[\s.;,:!-]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * The identity of an imported changelog entry: one normalized change line per
 * version, per product. `versionLabel` must be the label of the Version the
 * entry is actually linked to (falling back to the readme heading when no
 * Version matched) — keying on the *resolved* version is what stops two readme
 * headings that map to the same version from both being imported.
 */
export function changelogFingerprint(versionLabel: string, title: string): string {
  return `${canonicalVersion(versionLabel)}|${normalizeChangelogTitle(title)}`;
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
