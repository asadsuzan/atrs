# `client/src/components/ui/media-carousel.tsx`
**Purpose:** Media gallery carousel for a list of image/video URLs — single-item mode, or a multi-item main stage with animated transitions, hover prev/next controls, a mobile counter, and a thumbnail strip. Each item opens in a lightbox.
**Language / Size:** TSX / 5913 bytes

## Exports
- `MediaCarousel({ urls, title, className })` (named component).

## Props (`MediaCarouselProps`)
- `urls: string[]` — media URLs (images or videos).
- `title?: string` — used for alt text.
- `className?: string`.

## State / Refs / Context consumed
- `currentIndex` — active slide index.

## Imports (Internal / External)
- Internal: `MediaLightbox` (`./media-lightbox`), `Button` (`./button`), `cn` (`@/lib/utils`).
- External: lucide-react (`ChevronLeft, ChevronRight, FileVideo`); `AnimatePresence, motion` (framer-motion); react (`useState`).

## Behavior / Rendering
- Returns `null` for empty/missing `urls`.
- `isVideo(url)` = regex `\.(mp4|webm|ogg)$`.
- **Single item:** a rounded framed container wrapping `MediaLightbox`; renders `<video>` or `<img>` (`object-contain`, subtle hover scale on images).
- **Multiple items:** a main stage with `AnimatePresence mode="popLayout"` + `motion.div` (fade/scale transition keyed by index) inside a `MediaLightbox`. Hover-revealed round prev/next `Button`s (`next`/`prev` wrap with modulo, `stopPropagation`). A bottom pill counter `i+1 / n` shows only on mobile (`sm:hidden`).
- **Thumbnail strip:** horizontally scrollable buttons; the selected one gets a primary ring + scale, others are dimmed with a subtle overlay. Videos render a `FileVideo` placeholder. Scrollbars hidden via inline style + an injected `<style>` (`::-webkit-scrollbar { display:none }`).

## Functions & handlers
- `next(e)` / `prev(e)` — modulo index advance with `stopPropagation` (so clicks don't trigger the lightbox).

## Relationships
- No contexts. Composes `MediaLightbox` and `Button`; used to display product/activity media galleries.

## Edge cases & known limitations
- Video vs image is detected purely by file extension; extension-less video URLs render as `<img>`.
- The injected `<style>` targets `.flex::-webkit-scrollbar` globally rather than a scoped class — broad but harmless.
