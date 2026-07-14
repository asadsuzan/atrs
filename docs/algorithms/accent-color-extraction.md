# Accent Color Extraction

**Source:** `client/src/lib/imageColor.ts`. Consumed by product surfaces
(cards, presentation mode) to derive a per-product accent color from its
icon/imagery.

## Purpose
Extract a representative, vivid accent color from an image URL entirely
client-side, with graceful failure (returns `null`) when the image can't be read
(CORS taint, load error).

## Algorithm
1. **Cache check.** A per-URL in-memory cache short-circuits repeated calls.
2. **Downscale.** Draw the image into a small `32×32` canvas (enough signal,
   cheap to scan) via `drawImage`.
3. **Read pixels.** `getImageData` — this throws / taints on cross-origin images
   without CORS headers; caught → return `null`.
4. **Bucket & weight.** Iterate pixels, bucketing RGB and weighting each pixel's
   contribution by its **saturation** so muted/gray pixels contribute little and
   vivid colors dominate (avoids a washed-out average). Skip fully transparent
   pixels.
5. **Pick & normalize.** Select the dominant weighted bucket and normalize the
   result into a usable accent color.
6. **Cache & return** the color (or `null`).

## Complexity / performance
- Fixed O(32×32) = 1024-pixel scan regardless of source size, plus one canvas
  draw. Results cached per URL, so subsequent lookups are O(1).

## Edge cases & limitations
- Returns `null` on canvas taint (cross-origin image without CORS), load
  failure, or fully transparent input — callers must handle the null accent.
- 32×32 sampling is a heuristic; it favors vividness over exact dominant-color
  accuracy.

## Source references
- `client/src/lib/imageColor.ts`.
