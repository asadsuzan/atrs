# `client/src/components/marketing/SmartParser.ts`
**Purpose:** Pure text parser that turns a loosely-structured "Landing Page Data" template (as pasted into the Marketing Hub) into a structured marketing object. Non-React module.
**Language / Size:** TypeScript / 7767 bytes

## Exports
- `parseMarketingText(text: string): any` — main parser returning the marketing data shape.
- `safeParseLooseArray` is module-private (not exported).

## Props / API
- Input: raw template string. Output: object with keys `pluginName, trailerVideo, tutorialVideo, wpOrgUrl, docsUrl, heroDescription, thumbnailImage, problemList[], smarterWayList[], keyFeatures[], allFeatures[], proFeaturesDesc, demos[], topRatingLink, screenshots[], faqs[]`.

## Important logic / algorithms
- `safeParseLooseArray(input)`: safely converts a loose JS-array/object literal (unquoted keys, single quotes, trailing commas, comments) into valid JSON via regex normalization then `JSON.parse` — **never `eval`s the input**. Steps: strip `/* */` and `//` comments; convert single-quoted strings to escaped double-quoted; quote unquoted object keys; drop trailing commas before `}`/`]`. Returns `[]` on any failure (logged).
- Field extraction via `extractField(regex)` reading `match[1]`, trimming, and stripping wrapping `{ }`.
- Section extraction uses lookahead-bounded regexes for: hero (Short Description → next `== Why Choose`/`Thumbnail`), Problem list vs "A Smarter Way" list (newline-split, emoji-tolerant `❌`/`✅`), Key Features (split on `Title:` or numbered emoji `1️⃣`..`4️⃣`; parses title/`Des:`/`List:` with an old-format fallback), All Features (new `Title:`/`Des:` format vs old alternating-line fallback), Demos (extracts a `[ {...} ]` block and feeds it to `safeParseLooseArray`), Screenshots (`title – { url }` lines), FAQs (split on `Q:`, heuristic `A:`/`Yes,`/`No,` answer detection).
- Whole body wrapped in try/catch; on error returns the partially-filled `data` object (errors logged to console).

## Relationships
- Consumed by `MarketingManager` (`handleSmartImport`). Its expected input format is exactly what `MarketingManager.exportAsRawTemplate` produces, forming a round-trip.

## Edge cases & known limitations
- Heuristic and regex-driven — tolerant of several formats but brittle to layout changes; unmatched sections simply stay empty.
- FAQ answer detection is a "simple heuristic" and may mis-split answers that don't start with `A:`/`Yes`/`No`.
- `demos` parsing depends on the loose-array normalizer; malformed arrays yield `[]`.
- Returns `any`; no schema validation of the result.
