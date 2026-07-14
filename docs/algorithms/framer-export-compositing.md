# Image Framer — Canvas Compositing & Export

**Source:** `client/src/components/tools/framerExport.ts` (Canvas engine),
driven by `client/src/components/tools/ImageFramer.tsx` (settings UI) and the
`FramerExportContext` export queue (rendered by `FramerExportBoard`). Uses
`gif.js` (encode) and `gifuct-js` (decode).

## Purpose
Compose a screenshot/media into a styled "scene" — background + drop shadow +
window chrome, optionally 3D-tilted — and export it as an image (original
format), animated GIF, or WebM video, with pixel-stable, WYSIWYG output.

## Build-once, composite-per-frame model
`renderChrome(opts)` builds the static W×H scene **once** and returns a
`ChromeRender { width, height, base, composite(ctx, media, …) }`. `base` is
painted first each frame; `composite` paints the media on top (warping when
tilted). Stills call it once; GIF/video call it per frame.

## Algorithm

### Scene construction (`renderChrome`)
1. Paint scene background: image (cover/contain), CSS color / `linear-gradient`
   (parsed by `makeFill`), or transparent (to preserve PNG alpha).
2. For `none` style → return a direct media box (no window).
3. Else draw a blurred rounded drop shadow (Canvas blur ≈ CSS blur / 2),
   optionally warped; then the window chrome (fill, `drawBar` title bar /
   macOS traffic-lights / Windows controls / browser URL pill, border) into a
   local canvas.
4. Return `composite`: untilted → draw media onto baked chrome; tilted →
   composite chrome+media into a scratch canvas and `warpInto` it.

### 3D perspective warp (homography)
Canvas 2D is affine-only, so a true perspective tilt is drawn as a fine grid of
texture-mapped triangles:
1. `projectTilt` places the window's 4 corners exactly where CSS
   `perspective() rotateX/Y/Z()` would.
2. `getPerspectiveTransform` solves the homography (`solveLinear` = Gaussian
   elimination).
3. `warpInto` subdivides into an N×N grid (default detail 22) and draws two
   texture-mapped triangles per cell (`drawTexturedTriangle` = `invert3` +
   `setTransform` + clip; `expandTri` hides seams).

### Exports
- **`exportImage`** — composite once from the full-quality original (prefers
  `createImageBitmap` off-thread, falls back to `<img>`); output in the original
  MIME (PNG lossless, else quality 0.92).
- **`exportGif`** — decode frames with `gifuct-js` (full disposal handling:
  type 2 restore-to-bg, type 3 restore-to-previous, rebuilt from patch +
  accumulator); composite the scene onto each frame; downscale to
  `MAX_GIF_DIM` (800px longest edge); re-encode via `gif.js` (2 workers,
  Floyd–Steinberg serpentine dither, loop forever); yield to the UI periodically;
  report progress.
- **`exportVideo`** — play the source `<video>` muted, draw scene+frame per
  `requestAnimationFrame`, record `captureStream(30)` with `MediaRecorder`
  (VP9 if supported, else webm); resolve the Blob on stop; progress by
  `currentTime/duration`.

### Memory hygiene
Canvases are zeroed (`c.width=c.height=0`) after use; bitmaps closed; object URLs
revoked. Preview stills are downscaled to `PREVIEW_MAX_DIM` (1400) JPEG blob URLs.

## Edge cases & limitations
- GIF/video output is re-encoded/capped (GIF ≤ 800px, video → WebM) — not
  lossless.
- The perspective warp is a triangle-grid approximation; extreme tilts may show
  minor artifacts.
- Video export runs in real time (duration ≈ source playback).
- Transparent background is preserved only for PNG stills; other formats fall
  back to opaque.

## Source references
- `framerExport.{renderChrome,projectTilt,getPerspectiveTransform,warpInto,
  exportImage,exportGif,exportVideo}`.
- `FRAME_STYLES` / `frameLayout` are shared with the DOM preview for WYSIWYG
  parity.
