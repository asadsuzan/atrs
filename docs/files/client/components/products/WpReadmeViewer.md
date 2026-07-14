# `client/src/components/products/WpReadmeViewer.tsx`
**Purpose:** Renders a WordPress.org-style readme view: a tabbed main column of sections plus a sidebar (download, rating breakdown, meta, tags, contributors). Prefers live WP.org API data, falling back to parsing a raw `readme.txt`. Includes a self-contained `<style>` block.
**Language / Size:** TypeScript(React) / 21944 bytes

## Exports
- `WpReadmeViewer({ content, wpData? })` (named component).

## Props
- `content: string` — raw readme.txt contents (fallback/primary parse source).
- `wpData?: WpData | null` — optional live WordPress.org plugins-API data used to enrich the view (rating 0–100, sections HTML, contributors, ratings map, etc.).

## State / Hooks
- `parsed = useMemo(() => parseReadme(content), [content])`.
- `sections = useMemo(...)`: if `wpData.sections` present, uses its rendered HTML (skips `reviews`), title-cased, `DOMPurify.sanitize`d, ordered; else uses parsed sections (also sanitized).
- `active` tab index (clamped via `activeIdx`).

## Behavior / Rendering
- Two-column grid (main + 300px sidebar, collapses under 900px).
- Main: optional short-description tagline (only on tab 0), a tab nav of section titles, and the active section's sanitized HTML via `dangerouslySetInnerHTML`.
- Sidebar cards: download button (`wpData.download_link`), rating (stars from `rating/20`, review count) + ratings breakdown bars (5→1, normalized to max), meta rows (version, last-updated, active installs, WP/tested/PHP versions — `wpData` takes precedence over parsed header), tags (linked to WP.org tag pages when from `wpData`), and contributors (avatar or initials fallback, linked to profiles).
- Returns a "No readme content available" message when there are no sections.

## Important logic / algorithms
- `parseReadme(raw)`: hand-written parser — skips `=== Title ===`, reads `Key: value` header block, collects free-text short description, then `== Section ==` blocks; returns meta/shortDescription/sections.
- `renderBlocks(lines)`: converts a section body to HTML — `= subheading =` → h3, ordered (`1.`) / unordered (`*`/`-`) lists with open/close tracking, blank lines end lists, else paragraphs; inline formatting via `inline()` (`**bold**`, `` `code` ``, `[text](url)`), all HTML-escaped first (`esc`).
- `slug`, `titleCase`, `orderSections` (fixed `SECTION_ORDER` preference), `formatInstalls`, `timeAgo` (strips the time portion from WP.org dates).
- All rendered HTML (both API-supplied and locally-generated) is sanitized with `DOMPurify` before injection.

## Relationships
- Uses `dompurify`. Fed by product/import flows that have a plugin readme and/or WP.org API payload. Self-contained styling (no external CSS dependency) themed via CSS vars.

## Edge cases & known limitations
- The `reviews` section is intentionally omitted from the embedded view.
- Local readme parser is heuristic and may not match every plugin's formatting; API data is preferred when available.
- Ratings breakdown only shows when both `wpData.ratings` and `wpData.num_ratings` exist.
