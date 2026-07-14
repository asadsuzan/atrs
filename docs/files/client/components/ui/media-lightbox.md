# `client/src/components/ui/media-lightbox.tsx`
**Purpose:** Wraps arbitrary children in a click-to-zoom trigger that opens a full-screen Dialog showing the image or video.
**Language / Size:** TSX / 1531 bytes

## Exports
- `MediaLightbox({ mediaUrl, mediaType, children })` (named component).

## Props
- `mediaUrl: string` — media to show fullscreen.
- `mediaType: string` — `'video'` renders a `<video controls autoPlay>`, anything else renders an `<img>`.
- `children: React.ReactNode` — the trigger content (e.g. a thumbnail).

## Imports (Internal / External)
- Internal: `Dialog, DialogContent, DialogTrigger` (`@/components/ui/dialog`).
- External: lucide-react (`Maximize2`).

## Behavior / Rendering
- If `mediaUrl` is falsy, renders `children` unwrapped (no lightbox).
- Otherwise: `DialogTrigger asChild` wraps `children` in a `cursor-pointer` group with a hover overlay (dark scrim + centered `Maximize2` badge).
- `DialogContent` is styled transparent/borderless (wide, `max-w-screen-xl w-[90vw]`), with the close button restyled white-on-dark via `[&>button]` selectors; content is the `<video>` or `<img>` constrained to `max-h-[85vh] object-contain`.

## Relationships
- No contexts. Wraps the shared `Dialog`; used by `MediaCarousel` and other media previews.

## Edge cases & known limitations
- `mediaType` is a free-form string; only exact `'video'` triggers video rendering.
- No explicit alt text for the fullscreen image beyond a static "Fullscreen Media".
