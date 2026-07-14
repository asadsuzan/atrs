# `client/src/components/reports/PresentationMode.tsx`
**Purpose:** Full-screen, keyboard/wheel-driven slide deck for a monthly report: a summary slide, one slide per product (grouped feature/improvement/bug-fix cards with inline media carousels), and an optional thank-you slide. Supports fullscreen, dynamic per-product accent colors, a media lightbox, and month navigation.
**Language / Size:** TypeScript(React) / 35198 bytes

## Exports
- `PresentationMode({ report, periodLabel, onClose, monthMode?, isFetching?, canPrevMonth?, canNextMonth?, onPrevMonth?, onNextMonth? })` (named component).
- Internal sub-components: `AnimatedNumber`, `StatBlock`, `SummarySlide`, `ThankYouSlide`, `SlideCarousel`, `CountChip`, `ActivityCard`, `ProductSlide` (all module-private).

## Props
- `report: any` — `{ products[], summary }` for the period.
- `periodLabel: string`; `onClose: () => void`.
- `monthMode?: boolean` and `canPrevMonth?/canNextMonth?/onPrevMonth?/onNextMonth?` — enable in-deck month stepping.
- `isFetching?: boolean` — shows a spinner in the top bar.

## State / Hooks
- `index`, `direction`, `isFullscreen`, `zoom` (lightbox `{items,index}`), `productAccents` map, `prevPeriod` (render-time reset).
- `useQuery(['branding'], getBranding)`; `useAuth()` for reporter name/title.
- Refs: `containerRef` (fullscreen target), `wheelCooldownUntil`, `edgeArmed`.
- Effects: derive per-product accent colors from banner/icon via `extractAccentColor` (dynamic-accent mode, cancellable); keyboard controls; enter/exit fullscreen on mount + `fullscreenchange` listener; body-scroll lock while presenting.
- Rendered via `createPortal` to `document.body` (escapes transformed/blurred ancestors).

## Behavior / Rendering
- `slides` = summary + one per product + optional thanks. Progress bar fills by `(index+1)/total`.
- Top bar: brand mark/name, period label (or month stepper with prev/next), fetch spinner, slide counter, fullscreen toggle, close.
- Slide area uses `AnimatePresence` (blur+slide transition keyed by `index`). Bottom bar: Prev/Next + progress dots (click to jump).
- Lightbox overlay: image/video with gallery prev/next + counter, closes on backdrop/Escape.
- Summary slide: brand header + 4 `StatBlock`s (products/features/improvements/bugFixes with `AnimatedNumber` count-up) + "Prepared by".
- Product slide: header (icon/initial, name, category badge, per-type count chips) + grouped `ActivityCard` grid; each card shows title, version chip, cleaned description, media carousel, and nested "Included items".
- Thank-you slide: configurable title/message + reporter footer.

## Important logic / algorithms
- `onWheel`: content-first wheel navigation — advances immediately if the slide fits; for taller slides lets the slide scroll to its edge, "arms" on one absorbed tick, then advances on the next; a 650ms cooldown absorbs inertia.
- `toCleanText`: strips HTML tags and double-decodes entities (handles double-encoded imports like `&amp;nbsp;`) then collapses whitespace; `isPlaceholderDesc` hides auto-import filler.
- `activeAccent`: in dynamic mode a product slide uses its derived color (fallback to fixed accent), used for glow/progress/borders via `color-mix`.
- Keyboard: arrows/space/PageDown/Up navigate; `f` fullscreen; `[`/`]` month step; Escape closes (or exits lightbox first). Respects reduced motion (`useReducedMotion`, `MotionConfig reducedMotion="user"`).
- `mediaOf` reads `mediaUrls` with legacy single-`mediaUrl` fallback; `isVideoUrl` regex.
- Render-time index reset when `periodLabel` changes (avoids out-of-range index on a new month).

## Relationships
- Services/contexts: `getBranding` (`../../services/config`), `AuthContext`, `extractAccentColor` (`../../lib/imageColor`). Shares type-color/media conventions with `ReleasePublish` and the normal report view. Uses `framer-motion` heavily.

## Edge cases & known limitations
- `report` is untyped (`any`); assumes the report shape (`products[].product/activities/counts`, `summary`).
- Fullscreen is best-effort (wrapped in try/catch); the fixed portal overlay covers the viewport regardless.
- Dynamic accent extraction is async and per-render of the report; products without art fall back to the fixed accent.
