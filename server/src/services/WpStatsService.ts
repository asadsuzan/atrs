/**
 * Aggregates live, public stats for a WordPress.org plugin from several
 * services, used by the product card "WP stats" row:
 *   - WordPress.org plugin API (installs, downloads, rating, support, updated)
 *   - wp-rankings.com  (plugin rank)
 *   - wphive.com       (memory / speed impact)
 *   - patchstack.com   (known vulnerabilities)
 *   - plugintests.com  (link only — it blocks server requests)
 *
 * Each source is best-effort: failures degrade to null so a card always renders
 * its clickable icons even if a source is down. Results are cached per slug to
 * avoid hammering the upstreams.
 */

const UA = 'Mozilla/5.0 (compatible; ATRS/1.0; +https://bplugins.com)';
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const TIMEOUT_MS = 8000;

export interface WpOrgStats {
  activeInstalls: number | null;
  downloaded: number | null;
  rating: number | null; // 0..100
  numRatings: number | null;
  supportThreads: number | null;
  supportThreadsResolved: number | null;
  lastUpdated: string | null;
  version: string | null;
}

export interface WpStats {
  slug: string;
  links: {
    wporg: string;
    ranking: string;
    hive: string;
    patchstack: string;
    pt: string;
  };
  wporg: WpOrgStats | null;
  ranking: number | null;
  hive: { memory: string | null; speedSeconds: number | null } | null;
  patchstack: { present: number | null; patched: number | null } | null;
  fetchedAt: string;
}

const cache = new Map<string, { data: WpStats; expires: number }>();

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/json' }, signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const toInt = (s: string) => parseInt(s.replace(/[, ]/g, ''), 10);

async function fetchWpOrg(slug: string): Promise<WpOrgStats | null> {
  const text = await fetchText(
    `https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request[slug]=${encodeURIComponent(slug)}`,
  );
  if (!text) return null;
  try {
    const j: any = JSON.parse(text);
    if (!j || j.error) return null;
    return {
      activeInstalls: typeof j.active_installs === 'number' ? j.active_installs : null,
      downloaded: typeof j.downloaded === 'number' ? j.downloaded : null,
      rating: typeof j.rating === 'number' ? j.rating : null,
      numRatings: typeof j.num_ratings === 'number' ? j.num_ratings : null,
      supportThreads: typeof j.support_threads === 'number' ? j.support_threads : null,
      supportThreadsResolved: typeof j.support_threads_resolved === 'number' ? j.support_threads_resolved : null,
      lastUpdated: typeof j.last_updated === 'string' ? j.last_updated : null,
      version: typeof j.version === 'string' ? j.version : null,
    };
  } catch {
    return null;
  }
}

async function fetchRanking(slug: string): Promise<number | null> {
  const html = await fetchText(`https://wp-rankings.com/plugins/${encodeURIComponent(slug)}`);
  if (!html) return null;
  // e.g. "Plugin Rank ... #55,000"
  const m = html.match(/rank[^#]{0,120}#\s*([\d,]+)/i);
  return m ? toInt(m[1]) : null;
}

async function fetchHive(slug: string): Promise<WpStats['hive']> {
  const html = await fetchText(`https://wphive.com/plugins/${encodeURIComponent(slug)}/`);
  if (!html) return null;
  const mem = html.match(/average memory usage is\s*([\d.]+\s*(?:KB|MB|GB))/i);
  const speed = html.match(/loading time is increased by\s*([\d.]+)\s*s/i);
  const memory = mem ? mem[1].replace(/\s+/g, ' ').trim() : null;
  const speedSeconds = speed ? parseFloat(speed[1]) : null;
  if (memory === null && speedSeconds === null) return null;
  return { memory, speedSeconds };
}

async function fetchPatchstack(slug: string): Promise<WpStats['patchstack']> {
  const html = await fetchText(`https://patchstack.com/database/wordpress/plugin/${encodeURIComponent(slug)}/`);
  if (!html) return null;
  const present = html.match(/([\d,]+)\s*present/i);
  const patched = html.match(/([\d,]+)\s*patched/i);
  if (!present && !patched) return null;
  return {
    present: present ? toInt(present[1]) : null,
    patched: patched ? toInt(patched[1]) : null,
  };
}

function links(slug: string): WpStats['links'] {
  const s = encodeURIComponent(slug);
  return {
    wporg: `https://wordpress.org/plugins/${s}/`,
    ranking: `https://wp-rankings.com/plugins/${s}`,
    hive: `https://wphive.com/plugins/${s}/`,
    patchstack: `https://patchstack.com/database/wordpress/plugin/${s}/`,
    pt: `https://plugintests.com/plugins/wporg/${s}/latest`,
  };
}

export class WpStatsService {
  async getStats(slug: string, opts?: { force?: boolean }): Promise<WpStats> {
    const key = slug.trim().toLowerCase();
    const now = Date.now();
    const hit = cache.get(key);
    if (!opts?.force && hit && hit.expires > now) return hit.data;

    const [wporg, ranking, hive, patchstack] = await Promise.all([
      fetchWpOrg(key),
      fetchRanking(key),
      fetchHive(key),
      fetchPatchstack(key),
    ]);

    const data: WpStats = {
      slug: key,
      links: links(key),
      wporg,
      ranking,
      hive,
      patchstack,
      fetchedAt: new Date().toISOString(),
    };
    cache.set(key, { data, expires: now + TTL_MS });
    return data;
  }
}
