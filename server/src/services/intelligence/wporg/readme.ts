/**
 * Deterministic analysis of WP.org readme content.
 *
 * These helpers exist so that feature comparison and listing-quality scoring
 * are computed from the actual published readme rather than from a hand-typed
 * `keyFeatures` array (which nobody keeps current) or from an LLM's imagination.
 * The LLM later gets to *interpret* these extracted facts; it never sources
 * them.
 */

import { WpOrgClient, type WpPluginInfo } from './WpOrgClient';

/** A version entry recovered from a readme changelog section. */
export interface ChangelogEntry {
  version: string;
  /** Only set when the heading carried a parseable date. */
  date: Date | null;
  body: string;
}

/** Release-cadence facts derived from real changelog history. */
export interface CadenceFacts {
  /** Versions found in the changelog, newest first. */
  totalVersions: number;
  /** How many carried a parseable date — cadence stats use only these. */
  datedVersions: number;
  /** Mean days between consecutive dated releases, or null when under 2 exist. */
  medianDaysBetween: number | null;
  releasesLast90Days: number | null;
  releasesLast365Days: number | null;
  newestReleaseDate: Date | null;
  oldestReleaseDate: Date | null;
}

const BULLET_SPLIT = /<\/li>/i;

/**
 * Pulls candidate feature phrases out of readme HTML.
 *
 * WP.org readmes overwhelmingly express features as `<ul><li>` bullets in the
 * Description section, so bullets are the primary signal. We fall back to
 * sentence extraction only when a readme has no list at all, and we filter
 * aggressively — marketing filler ("Buy now!", "5 star rated") is not a feature
 * and would poison a gap matrix.
 */
export function extractFeatures(info: Pick<WpPluginInfo, 'sections' | 'shortDescription'>, limit = 40): string[] {
  const candidates: string[] = [];
  const preferredSections = ['features', 'description', 'key features', 'why', 'installation'];
  const sectionKeys = [
    ...preferredSections.filter((k) => k in info.sections),
    ...Object.keys(info.sections).filter((k) => !preferredSections.includes(k)),
  ];

  for (const key of sectionKeys) {
    // Changelog/upgrade notices describe history, not current capability.
    if (key === 'changelog' || key === 'upgrade_notice' || key === 'faq' || key === 'screenshots') continue;
    const html = info.sections[key];
    if (!html) continue;

    const listItems = html
      .split(BULLET_SPLIT)
      .map((chunk) => {
        const open = chunk.lastIndexOf('<li');
        return open === -1 ? '' : chunk.slice(open);
      })
      .map((chunk) => WpOrgClient.stripHtml(chunk))
      .filter(Boolean);

    candidates.push(...listItems);
  }

  if (candidates.length === 0) {
    const prose = WpOrgClient.stripHtml(info.sections['description'] || '') || info.shortDescription;
    candidates.push(...prose.split(/(?<=[.!?])\s+/));
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of candidates) {
    const feature = cleanFeaturePhrase(raw);
    if (!feature) continue;
    const key = feature.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(feature);
    if (out.length >= limit) break;
  }
  return out;
}

/** Marketing noise that shows up in readme bullets but describes no capability. */
const NOISE = [
  /^(buy|get|download|install|upgrade|try)\s/i,
  /\b(star|rated|review|testimonial|award)\b/i,
  /\b(discount|coupon|sale|price|pricing|\$\d)/i,
  /^(read more|learn more|see|check out|visit|click)\b/i,
  /^(documentation|docs|support|changelog|credits|license|faq)$/i,
  /\bfollow us\b|\bsubscribe\b/i,
];

function cleanFeaturePhrase(raw: string): string | null {
  let s = raw
    .replace(/^[\s*\-–—•·]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Strip a leading bold lead-in ("Responsive Design – works everywhere").
  s = s.replace(/^([A-Z][\w /&-]{2,40})\s*[:–—-]\s+/, '$1 — ');
  if (s.length < 8 || s.length > 180) return null;
  // Needs at least two words and some letters to be a capability statement.
  if (!/[a-z]/i.test(s) || s.split(/\s+/).length < 2) return null;
  if (NOISE.some((re) => re.test(s))) return null;
  return s.replace(/[.;,]+$/, '');
}

const VERSION_HEADING = /^\s*=+\s*v?([0-9]+(?:\.[0-9]+){0,3}(?:[-.][0-9A-Za-z]+)*)\s*(?:[-–—(\[|:]\s*([^=\]\)]{3,40}))?\s*[\)\]]?\s*=+\s*$/;

/** The same marker shape, matched anywhere in a line rather than anchored. */
const INLINE_VERSION_MARKER =
  /(=+\s*v?[0-9]+(?:\.[0-9]+){0,3}(?:[-.][0-9A-Za-z]+)*(?:\s*[-–—(\[|:]\s*[^=\n\]\)]{3,40}[\)\]]?)?\s*=+)/g;

/**
 * Strips tags and decodes entities exactly as `WpOrgClient.stripHtml` does, but
 * keeps newlines.
 *
 * The shared stripper collapses *all* whitespace, which destroys the line
 * structure this parser depends on: with newlines gone, `= 1.2.3 =` and the
 * bullet list beneath it become one line, the anchored heading regex stops
 * matching, and every changelog silently parses as zero versions.
 */
function stripHtmlKeepingLines(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&#039;|&rsquo;/g, "'")
    .replace(/&#8211;|&ndash;/g, '-')
    // Collapse runs of horizontal whitespace only.
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n[^\S\n]*/g, '\n')
    .trim();
}

/**
 * Recovers version history from a readme changelog section.
 *
 * WP.org renders `= 1.4.2 =` headings as `<h4>`, but plenty of readmes keep the
 * raw `=` form, and dates appear in a dozen shapes ("2026-05-01", "May 1,
 * 2026", "(01.05.2026)"). We accept the version whenever we can read it and
 * treat the date as optional — a missing date must not silently become "today",
 * which would fabricate a release cadence.
 */
export function parseChangelog(changelogHtml: string): ChangelogEntry[] {
  if (!changelogHtml) return [];

  // Convert heading tags to the `= x.y.z =` line form so one parser handles both.
  const normalised = changelogHtml
    .replace(/<h[1-6][^>]*>\s*/gi, '\n= ')
    .replace(/\s*<\/h[1-6]>/gi, ' =\n')
    .replace(/<\/(p|li|ul|ol|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  const lines = stripHtmlKeepingLines(normalised)
    // Some readmes keep the whole changelog on one line; isolating the markers
    // means those still yield headings rather than one unparseable blob.
    .replace(INLINE_VERSION_MARKER, '\n$1\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;

  for (const line of lines) {
    const m = line.match(VERSION_HEADING) || line.match(/^=\s*v?([0-9]+(?:\.[0-9]+){0,3})\s*(.*?)\s*=$/);
    if (m) {
      if (current) entries.push(current);
      current = { version: m[1], date: parseLooseDate(m[2] || ''), body: '' };
      continue;
    }
    if (current) current.body += (current.body ? ' ' : '') + line;
  }
  if (current) entries.push(current);

  // De-dupe by version, keeping the first (newest, since readmes list descending).
  const seen = new Set<string>();
  return entries.filter((e) => {
    if (seen.has(e.version)) return false;
    seen.add(e.version);
    return true;
  });
}

/**
 * Parses the assorted date formats found beside changelog version headings.
 * Returns null rather than guessing — an invented date corrupts cadence stats.
 */
export function parseLooseDate(text: string): Date | null {
  const s = text.replace(/[()\[\]]/g, ' ').trim();
  if (!s) return null;

  // ISO first: 2026-05-01 / 2026.05.01 / 2026/05/01
  const iso = s.match(/\b(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/);
  if (iso) return safeDate(+iso[1], +iso[2] - 1, +iso[3]);

  // Day-first or month-first with a 4-digit year: 01-05-2026, 5/1/2026
  const dmy = s.match(/\b(\d{1,2})[-./](\d{1,2})[-./](20\d{2})\b/);
  if (dmy) {
    const a = +dmy[1];
    const b = +dmy[2];
    // Only one ordering can be valid when a value exceeds 12; otherwise assume
    // day-first, the dominant convention in WP.org readmes.
    if (a > 12 && b <= 12) return safeDate(+dmy[3], b - 1, a);
    if (b > 12 && a <= 12) return safeDate(+dmy[3], a - 1, b);
    return safeDate(+dmy[3], b - 1, a);
  }

  // "May 1, 2026" / "1 May 2026" / "May 2026"
  const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
  const mdy = s.match(new RegExp(`\\b(${MONTHS})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(20\\d{2})\\b`, 'i'));
  if (mdy) return safeDate(+mdy[3], monthIndex(mdy[1]), +mdy[2]);
  const dmyName = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS})[a-z]*\\.?,?\\s*(20\\d{2})\\b`, 'i'));
  if (dmyName) return safeDate(+dmyName[3], monthIndex(dmyName[2]), +dmyName[1]);
  const my = s.match(new RegExp(`\\b(${MONTHS})[a-z]*\\.?\\s+(20\\d{2})\\b`, 'i'));
  if (my) return safeDate(+my[2], monthIndex(my[1]), 1);

  return null;
}

function monthIndex(name: string): number {
  return ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(
    name.slice(0, 3).toLowerCase(),
  );
}

function safeDate(y: number, m: number, d: number): Date | null {
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m, d));
  // Reject roll-over (e.g. Feb 31 → Mar 3) and implausible future dates.
  if (dt.getUTCMonth() !== m || dt.getUTCDate() !== d) return null;
  if (dt.getTime() > Date.now() + 7 * 24 * 3600 * 1000) return null;
  return dt;
}

/**
 * Release cadence from dated changelog entries.
 *
 * Uses the median gap rather than the mean: a single 400-day dormant stretch
 * shouldn't make an otherwise weekly-shipping plugin look slow.
 */
export function computeCadence(entries: ChangelogEntry[], now = new Date()): CadenceFacts {
  const dated = entries
    .filter((e): e is ChangelogEntry & { date: Date } => e.date !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const facts: CadenceFacts = {
    totalVersions: entries.length,
    datedVersions: dated.length,
    medianDaysBetween: null,
    releasesLast90Days: null,
    releasesLast365Days: null,
    newestReleaseDate: dated[0]?.date ?? null,
    oldestReleaseDate: dated[dated.length - 1]?.date ?? null,
  };

  if (dated.length >= 2) {
    const gaps: number[] = [];
    for (let i = 0; i < dated.length - 1; i++) {
      const days = (dated[i].date.getTime() - dated[i + 1].date.getTime()) / 86_400_000;
      if (days >= 0) gaps.push(days);
    }
    if (gaps.length) {
      gaps.sort((a, b) => a - b);
      const mid = Math.floor(gaps.length / 2);
      facts.medianDaysBetween =
        Math.round((gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2) * 10) / 10;
    }
  }

  // Only report windowed counts when history actually covers the window;
  // otherwise "2 releases in 365 days" would understate a 3-month-old plugin.
  const spanDays = facts.oldestReleaseDate
    ? (now.getTime() - facts.oldestReleaseDate.getTime()) / 86_400_000
    : 0;
  const within = (days: number) =>
    dated.filter((e) => now.getTime() - e.date.getTime() <= days * 86_400_000).length;
  if (dated.length > 0 && spanDays >= 90) facts.releasesLast90Days = within(90);
  if (dated.length > 0 && spanDays >= 365) facts.releasesLast365Days = within(365);

  return facts;
}

/** Compares dotted version strings numerically. Returns -1, 0 or 1. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.\-+]/).map((p) => parseInt(p, 10));
  const pb = b.split(/[.\-+]/).map((p) => parseInt(p, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = Number.isFinite(pa[i]) ? pa[i] : 0;
    const y = Number.isFinite(pb[i]) ? pb[i] : 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * How many minor WP releases behind the plugin's "Tested up to" value is.
 * WP ships ~3 minors a year, so being 2+ behind is what users notice on the
 * listing page ("Untested with your version of WordPress").
 */
export function wpVersionLag(testedUpTo: string | null, currentWp: string | null): number | null {
  if (!testedUpTo || !currentWp) return null;
  const t = testedUpTo.split('.').map(Number);
  const c = currentWp.split('.').map(Number);
  if (!Number.isFinite(t[0]) || !Number.isFinite(c[0])) return null;
  // WP versions are major.minor (6.4, 6.5); treat each minor as one step and
  // each major as ten, matching how WP has historically numbered releases.
  const steps = (v: number[]) => (v[0] || 0) * 10 + (v[1] || 0);
  return Math.max(0, steps(c) - steps(t));
}

/** Weighted mean star rating (1–5) from the histogram, independent of WP's 0–100 field. */
export function meanStars(ratings: { 1: number; 2: number; 3: number; 4: number; 5: number } | null): number | null {
  if (!ratings) return null;
  const total = ratings[1] + ratings[2] + ratings[3] + ratings[4] + ratings[5];
  if (total === 0) return null;
  const sum = ratings[1] * 1 + ratings[2] * 2 + ratings[3] * 3 + ratings[4] * 4 + ratings[5] * 5;
  return Math.round((sum / total) * 100) / 100;
}

/** Share of reviews at 1–2 stars — the number that actually drags a listing down. */
export function negativeReviewShare(
  ratings: { 1: number; 2: number; 3: number; 4: number; 5: number } | null,
): number | null {
  if (!ratings) return null;
  const total = ratings[1] + ratings[2] + ratings[3] + ratings[4] + ratings[5];
  if (total === 0) return null;
  return Math.round(((ratings[1] + ratings[2]) / total) * 1000) / 10;
}
