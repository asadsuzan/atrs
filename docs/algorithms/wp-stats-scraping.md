# WordPress.org Ecosystem Stats Aggregation

**Source:** `server/src/services/WpStatsService.ts`. Consumer:
`ProductController.getProductWpStats` (`GET /api/products/:id/wp-stats`),
surfaced by `client/src/components/products/ProductWpStats.tsx`.

## Purpose
Aggregate a plugin's public ecosystem metrics from several WordPress.org-related
sources into one payload (installs, rating, last-updated, plus third-party
rank/security signals), degrading gracefully when any source is unavailable.

## Sources
1. **WordPress.org plugin info JSON API** — authoritative core stats (active
   installs, rating, version, last updated, etc.).
2. **wp-rankings** — regex-scraped HTML for ranking data.
3. **wphive** — regex-scraped HTML for additional signals.
4. **patchstack** — regex-scraped HTML for security/vulnerability signals.
5. **plugintests.com** — **link-only** (not fetched); a deep link is returned.

## Algorithm
1. **Cache check.** Per-slug in-memory cache with a **6-hour TTL** — a cache hit
   returns immediately (these stats change slowly and the sources are rate-
   sensitive).
2. **Fetch in parallel** with an **8s `AbortController` timeout** per request.
   The JSON API is parsed structurally; the three HTML sources are parsed with
   targeted regexes.
3. **Best-effort merge.** Each source is wrapped so a failure (timeout, non-OK,
   parse miss) yields `null` for that source's fields rather than failing the
   whole request. The plugintests link is always included.
4. **Cache & return** the merged stats object.

## Complexity / performance
- At most one outbound fan-out per slug per 6h. Bounded latency via the 8s
  timeout on each source.

## Edge cases & limitations
- **Fragile by nature:** the three HTML sources are regex-scraped, so markup
  changes upstream can silently null those fields (documented degradation, not
  an error).
- plugintests.com is never fetched — only linked.
- Stats are up to 6h stale due to caching.
- In-memory cache is per-instance (not shared across serverless instances).

## Source references
- `server/src/services/WpStatsService.ts`.
