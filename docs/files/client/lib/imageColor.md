# `client/src/lib/imageColor.ts`
**Purpose:** Extracts a representative accent color from an image (product logo/banner) entirely client-side, for the presentation deck's "dynamic accent" mode. Resolves to a hex string or `null` on failure, and caches per URL.
**Language / Size:** TypeScript / 4216 bytes

## Exports
- `extractAccentColor(url?: string): Promise<string | null>` — named export.

## API / Signature
- Param: `url?: string` — image URL. Falsy → resolves `null`.
- Returns: `Promise<string | null>` — `#rrggbb` accent, or `null` when it can't be computed (no url, load error, tainted canvas, no opaque pixels).

## Imports (Internal / External)
None (no imports). Uses browser globals: `Image`, `document.createElement('canvas')`, Canvas 2D context.

## Behavior / Implementation
- **Cache:** module-level `Map<string, string | null>` keyed by URL; a cache hit resolves synchronously (wrapped in a Promise). Results (including `null`) are cached after computation.
- **Load:** creates an `Image` with `crossOrigin='anonymous'` and `decoding='async'`, sets `img.src = url`. `onerror` → resolve `null`.
- **Sample:** on load, draws the image into a 32×32 canvas (context created with `willReadFrequently: true`; missing context → `null`) and reads `getImageData`.
- **Analyze pixels** (stride 4 = RGBA):
  - Skips pixels with alpha `< 128`.
  - Maintains a running average (`avgR/G/B/avgN`) of all opaque pixels as a fallback.
  - Skips near-white (`lum > 0.93`), near-black (`lum < 0.07`), and low-saturation (`sat < 0.18`) pixels.
  - Buckets remaining vivid pixels into a coarse RGB grid (5-bit-per-channel key: `((r>>5)<<6)|((g>>5)<<3)|(b>>5)`), accumulating saturation-weighted sums.
  - Picks the bucket with the greatest total weight; its weighted mean is the accent. If no vivid bucket exists (monochrome art), falls back to the overall opaque average. If `avgN === 0`, resolves `null`.
- **Normalize:** `normalize()` nudges toward a usable mid-range so it reads on light and dark decks — luminance `> 0.75` darkens (×0.72), `< 0.12` lightens (×1.6, clamped to 255), else unchanged.
- Converts to hex via `rgbToHex`/`toHex` (each channel clamped 0–255, rounded, 2-digit hex).
- Any exception in the canvas path (e.g. tainted canvas / blocked read) resolves `null`.

## Data structures / Types / Constants
- Helpers: `toHex`, `rgbToHex`, `luminance` (0.299R+0.587G+0.114B /255), `saturation` (HSV-style (max−min)/max), `normalize`.
- Sample size constant `size = 32`. Bucket = `{ w, r, g, b }` weighted sums.

## Relationships
- Consumed by the presentation/report deck ("dynamic accent" mode) to theme slides from a product's logo/banner.
- Relies on ATRS serving `/uploads` with permissive CORS so the canvas isn't tainted.

## Edge cases & known limitations
- Cross-origin images without proper CORS taint the canvas → resolves `null` (graceful fallback).
- Fully transparent images (no opaque pixels) → `null`.
- Cache is unbounded and lives for the page session; no eviction.
- Purely browser-side; not SSR-safe.
