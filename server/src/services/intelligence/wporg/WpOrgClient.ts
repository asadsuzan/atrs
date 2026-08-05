/**
 * The single typed gateway to WordPress.org's public plugin APIs.
 *
 * Everything the intelligence layer claims about the market must trace back to
 * a real number fetched here. The previous implementation asked an LLM to
 * "identify real competitors" and to guess their URLs and feature lists, which
 * produced confident fiction. WP.org already publishes the facts — installs,
 * ratings, support-thread resolution, release dates, readme text — so we fetch
 * them and let the LLM interpret only what we hand it.
 *
 * Endpoints used (all public, unauthenticated):
 *   - plugins/info/1.2 action=plugin_information  → one plugin, full detail
 *   - plugins/info/1.2 action=query_plugins       → search / browse by tag
 *   - core/version-check/1.7                      → current WP version
 *
 * Every call is cached and best-effort: a network failure returns null rather
 * than throwing, so an analysis run degrades to "no market data" instead of
 * collapsing.
 */

const UA = 'Mozilla/5.0 (compatible; ATRS/1.0; +https://bplugins.com)';
const TIMEOUT_MS = 10_000;
const INFO_TTL_MS = 60 * 60 * 1000; // 1h — plugin detail moves slowly
const SEARCH_TTL_MS = 6 * 60 * 60 * 1000; // 6h — search results move slower still
const CORE_TTL_MS = 12 * 60 * 60 * 1000;

/** Rating histogram: how many reviews gave each star count. */
export interface WpRatings {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

/** The subset of `plugin_information` the intelligence layer relies on. */
export interface WpPluginInfo {
  slug: string;
  name: string;
  version: string | null;
  author: string | null;
  authorProfile: string | null;
  homepage: string | null;
  shortDescription: string;
  /** Raw readme sections, HTML, keyed by lowercased section name. */
  sections: Record<string, string>;
  tags: string[];
  /** 0..100 as WP.org reports it. */
  rating: number | null;
  numRatings: number;
  ratings: WpRatings | null;
  activeInstalls: number | null;
  downloaded: number | null;
  supportThreads: number | null;
  supportThreadsResolved: number | null;
  lastUpdated: Date | null;
  added: Date | null;
  requires: string | null;
  requiresPhp: string | null;
  testedUpTo: string | null;
  /** Version label → download URL, from which we derive release cadence. */
  versions: Record<string, string>;
  screenshotCount: number;
  hasBanner: boolean;
  hasIcon: boolean;
  donateLink: string | null;
  contributorCount: number;
  fetchedAt: Date;
}

/** A lightweight search hit from `query_plugins`. */
export interface WpSearchHit {
  slug: string;
  name: string;
  shortDescription: string;
  author: string | null;
  rating: number | null;
  numRatings: number;
  activeInstalls: number | null;
  lastUpdated: Date | null;
  tags: string[];
  homepage: string | null;
}

const cache = new Map<string, { value: unknown; expires: number }>();

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load();
  // Only cache successful loads so a transient outage isn't remembered for an hour.
  if (value !== null && value !== undefined) {
    cache.set(key, { value, expires: Date.now() + ttlMs });
  }
  return value;
}

async function getJson(url: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/**
 * WP.org dates arrive in several shapes: "2026-06-14 10:22am GMT" from
 * `last_updated`, ISO-ish from `added`. Anything unparseable becomes null so a
 * bad string can never masquerade as a real timestamp in a cadence calculation.
 */
function parseWpDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  // Strip the trailing "GMT"/"UTC" marker and normalise the am/pm clock so
  // Date.parse handles it consistently across Node versions.
  const cleaned = s
    .replace(/\s*(GMT|UTC)\s*$/i, '')
    .replace(/(\d)(am|pm)$/i, '$1 $2')
    .trim();
  const d = new Date(cleaned.includes('T') ? cleaned : cleaned.replace(' ', 'T') + 'Z');
  if (!Number.isNaN(d.getTime())) return d;
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function normaliseSections(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'string') out[k.toLowerCase()] = v;
    }
  }
  return out;
}

function normaliseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t)).filter(Boolean);
  if (raw && typeof raw === 'object') return Object.values(raw as Record<string, unknown>).map((t) => String(t)).filter(Boolean);
  return [];
}

function countScreenshots(raw: unknown): number {
  if (Array.isArray(raw)) return raw.length;
  if (raw && typeof raw === 'object') return Object.keys(raw as object).length;
  return 0;
}

function normaliseRatings(raw: unknown): WpRatings | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const pick = (k: string) => num(r[k]) ?? 0;
  const out: WpRatings = { 1: pick('1'), 2: pick('2'), 3: pick('3'), 4: pick('4'), 5: pick('5') };
  const total = out[1] + out[2] + out[3] + out[4] + out[5];
  return total > 0 ? out : null;
}

function stripHtml(html: string): string {
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
    .replace(/\s+/g, ' ')
    .trim();
}

function toPluginInfo(j: any): WpPluginInfo | null {
  const slug = str(j?.slug);
  const name = str(j?.name);
  if (!slug || !name) return null;

  const banner = j?.banners;
  const hasBanner = !!(banner && typeof banner === 'object' && (banner.high || banner.low));
  const icons = j?.icons;
  const hasIcon = !!(
    icons &&
    typeof icons === 'object' &&
    Object.entries(icons).some(([k, v]) => k !== 'default' && typeof v === 'string' && v)
  );

  return {
    slug,
    name: stripHtml(name),
    version: str(j?.version),
    author: j?.author ? stripHtml(String(j.author)) : null,
    authorProfile: str(j?.author_profile),
    homepage: str(j?.homepage),
    shortDescription: stripHtml(String(j?.short_description || '')),
    sections: normaliseSections(j?.sections),
    tags: normaliseTags(j?.tags),
    rating: num(j?.rating),
    numRatings: num(j?.num_ratings) ?? 0,
    ratings: normaliseRatings(j?.ratings),
    activeInstalls: num(j?.active_installs),
    downloaded: num(j?.downloaded),
    supportThreads: num(j?.support_threads),
    supportThreadsResolved: num(j?.support_threads_resolved),
    lastUpdated: parseWpDate(j?.last_updated),
    added: parseWpDate(j?.added),
    requires: str(j?.requires),
    requiresPhp: str(j?.requires_php),
    testedUpTo: str(j?.tested),
    versions: j?.versions && typeof j.versions === 'object' ? (j.versions as Record<string, string>) : {},
    screenshotCount: countScreenshots(j?.screenshots),
    hasBanner,
    hasIcon,
    donateLink: str(j?.donate_link),
    contributorCount:
      j?.contributors && typeof j.contributors === 'object' ? Object.keys(j.contributors).length : 0,
    fetchedAt: new Date(),
  };
}

function toSearchHit(j: any): WpSearchHit | null {
  const slug = str(j?.slug);
  const name = str(j?.name);
  if (!slug || !name) return null;
  return {
    slug,
    name: stripHtml(name),
    shortDescription: stripHtml(String(j?.short_description || '')),
    author: j?.author ? stripHtml(String(j.author)) : null,
    rating: num(j?.rating),
    numRatings: num(j?.num_ratings) ?? 0,
    activeInstalls: num(j?.active_installs),
    lastUpdated: parseWpDate(j?.last_updated),
    tags: normaliseTags(j?.tags),
    homepage: str(j?.homepage),
  };
}

/** Fields we ask WP.org to include; omitting the rest keeps responses small. */
const INFO_FIELDS = [
  'short_description',
  'sections',
  'description',
  'tags',
  'ratings',
  'active_installs',
  'downloaded',
  'support_threads',
  'last_updated',
  'added',
  'requires',
  'requires_php',
  'tested',
  'versions',
  'screenshots',
  'banners',
  'icons',
  'donate_link',
  'contributors',
  'homepage',
];

function infoFieldParams(prefix: string): string {
  return INFO_FIELDS.map((f) => `${prefix}[fields][${f}]=1`).join('&');
}

export class WpOrgClient {
  /** Full detail for one plugin slug. Null when the slug doesn't exist or WP.org is unreachable. */
  static async getPlugin(slug: string): Promise<WpPluginInfo | null> {
    const key = slug.trim().toLowerCase();
    if (!key) return null;
    return cached(`info:${key}`, INFO_TTL_MS, async () => {
      const url =
        `https://api.wordpress.org/plugins/info/1.2/?action=plugin_information` +
        `&request[slug]=${encodeURIComponent(key)}&${infoFieldParams('request')}`;
      const j = await getJson(url);
      // WP.org signals "no such plugin" with an { error } body rather than a 404.
      if (!j || j.error) return null;
      return toPluginInfo(j);
    });
  }

  /** Fetch many slugs concurrently, dropping the ones that fail. */
  static async getPlugins(slugs: string[]): Promise<WpPluginInfo[]> {
    const unique = [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
    const results = await Promise.all(unique.map((s) => this.getPlugin(s)));
    return results.filter((r): r is WpPluginInfo => r !== null);
  }

  /**
   * Keyword search across the plugin directory — the honest replacement for
   * asking an LLM to name competitors.
   */
  static async search(term: string, perPage = 24): Promise<WpSearchHit[]> {
    const q = term.trim();
    if (!q) return [];
    return cached(`search:${q.toLowerCase()}:${perPage}`, SEARCH_TTL_MS, async () => {
      const url =
        `https://api.wordpress.org/plugins/info/1.2/?action=query_plugins` +
        `&request[search]=${encodeURIComponent(q)}&request[per_page]=${perPage}` +
        `&${infoFieldParams('request')}`;
      const j = await getJson(url);
      const list = Array.isArray(j?.plugins) ? j.plugins : [];
      return list.map(toSearchHit).filter((h: WpSearchHit | null): h is WpSearchHit => h !== null);
    });
  }

  /** Browse the directory by tag — finds category peers a keyword search misses. */
  static async searchByTag(tag: string, perPage = 24): Promise<WpSearchHit[]> {
    const t = tag.trim().toLowerCase();
    if (!t) return [];
    return cached(`tag:${t}:${perPage}`, SEARCH_TTL_MS, async () => {
      const url =
        `https://api.wordpress.org/plugins/info/1.2/?action=query_plugins` +
        `&request[tag]=${encodeURIComponent(t)}&request[per_page]=${perPage}` +
        `&${infoFieldParams('request')}`;
      const j = await getJson(url);
      const list = Array.isArray(j?.plugins) ? j.plugins : [];
      return list.map(toSearchHit).filter((h: WpSearchHit | null): h is WpSearchHit => h !== null);
    });
  }

  /** Latest stable WordPress version, used to judge whether "Tested up to" is stale. */
  static async getCurrentWpVersion(): Promise<string | null> {
    return cached('core:version', CORE_TTL_MS, async () => {
      const j = await getJson('https://api.wordpress.org/core/version-check/1.7/');
      const offers = Array.isArray(j?.offers) ? j.offers : [];
      for (const o of offers) {
        const v = str(o?.current);
        if (v) return v;
      }
      return null;
    });
  }

  /** Exposed so readme parsing and prompt building share one HTML stripper. */
  static stripHtml = stripHtml;

  /** Test seam — lets suites start from a clean cache. */
  static clearCache(): void {
    cache.clear();
  }
}
