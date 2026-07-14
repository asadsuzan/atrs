# `server/src/services/WpStatsService.ts`
**Purpose:** Aggregates live, public stats for a WordPress.org plugin from several third-party sources (WP.org API, wp-rankings, wphive, patchstack) into one payload for the product card "WP stats" row, with best-effort per-source degradation and a per-slug in-memory cache.
**Language / Size:** TypeScript / 5647 bytes

## Exports
- `interface WpOrgStats` — `{ activeInstalls; downloaded; rating (0..100); numRatings; supportThreads; supportThreadsResolved; lastUpdated; version }`, all `number|null` except lastUpdated/version (`string|null`).
- `interface WpStats` — `{ slug; links{wporg,ranking,hive,patchstack,pt}; wporg: WpOrgStats|null; ranking: number|null; hive{memory,speedSeconds}|null; patchstack{present,patched}|null; fetchedAt: string }`.
- `class WpStatsService`.

## Imports (Internal / External)
None internal. External: global `fetch`, `AbortController`, `setTimeout` (Node). No DB.

## Functions / Methods (module-private helpers + service)
- **fetchText(url): Promise<string|null>** — GET with UA header and `Accept: text/html,application/json`, aborted after `TIMEOUT_MS` (8000ms) via AbortController; returns body text, or `null` on non-OK / thrown / timeout. All source fetches funnel through this.
- **toInt(s): number** — `parseInt` after stripping commas/spaces.
- **fetchWpOrg(slug): Promise<WpOrgStats|null>** — WP.org `plugins/info/1.2/?action=plugin_information&request[slug]=...`; JSON-parses; returns null on empty/`error`/parse failure; each field type-checked (`typeof === 'number'|'string'`, else null).
- **fetchRanking(slug): Promise<number|null>** — GETs `wp-rankings.com/plugins/<slug>`, regex `/rank[^#]{0,120}#\s*([\d,]+)/i` → `toInt`.
- **fetchHive(slug): Promise<WpStats['hive']>** — GETs `wphive.com/plugins/<slug>/`; regex-extracts `average memory usage is <n KB|MB|GB>` and `loading time is increased by <n> s`; returns null if both absent, else `{memory, speedSeconds}`.
- **fetchPatchstack(slug): Promise<WpStats['patchstack']>** — GETs `patchstack.com/database/wordpress/plugin/<slug>/`; regex `<n> present` / `<n> patched`; null if both absent.
- **links(slug): WpStats['links']** — builds the five outbound URLs (wporg, ranking, hive, patchstack, `pt` = plugintests.com — link only, since it blocks server requests).
- **WpStatsService.getStats(slug, opts?{force?}): Promise<WpStats>** — see Important algorithms.

## Data structures / Types / Constants
- `UA` = `'Mozilla/5.0 (compatible; ATRS/1.0; +https://bplugins.com)'` (User-Agent for all fetches).
- `TTL_MS` = `6 * 60 * 60 * 1000` (6 hours cache lifetime).
- `TIMEOUT_MS` = `8000` (per-request abort timeout).
- `cache: Map<string, { data: WpStats; expires: number }>` (module-level, per normalized slug).

## Important algorithms

### `getStats` — cache + parallel fan-out
1. `key = slug.trim().toLowerCase()`.
2. Cache hit: unless `opts.force`, if a non-expired entry exists return it.
3. `Promise.all([fetchWpOrg, fetchRanking, fetchHive, fetchPatchstack])` — all four sources fetched concurrently; each independently yields null on failure (best-effort).
4. Assemble `WpStats` with `links(key)` and `fetchedAt = new Date().toISOString()`.
5. Store in cache with `expires = now + TTL_MS`; return.

### Scraping approach
WP.org is a JSON API; ranking/hive/patchstack are HTML pages scraped with tolerant regexes. Numbers are comma/space-stripped via `toInt`. Any source that is down/blocked/times-out contributes `null`, so a card always renders its clickable icons.

## Relationships
- Consumer: product card / WP-stats route (product directory UI "WP stats" row).
- External sources: api.wordpress.org (JSON), wp-rankings.com, wphive.com, patchstack.com (HTML scrape); plugintests.com (link only, not fetched).

## Edge cases & known limitations
- HTML scraping is regex-based and brittle: upstream markup/wording changes silently yield null.
- Cache is per-process in-memory (lost on restart; not shared across serverless instances); 6h TTL, bypassable with `force`.
- 8s timeout per source via AbortController; a slow source caps at that latency.
- plugintests.com blocks server requests, so only a link is provided (`pt`), never fetched.
- No authentication or rate-limit handling beyond the shared UA header.
