# `client/src/components/tools/framerExport.ts`
**Purpose:** The Canvas-API compositing engine behind the Image Framer. Builds a static W×H "scene" (background + shadow + window chrome, optionally 3D-tilted) once and returns a per-frame `composite()` closure; then exports images (original format), animated GIFs, and WebM videos with pixel-stable output. Non-React module.
**Language / Size:** TypeScript / 32288 bytes

## Exports
- Types/consts: `MediaKind`, `MediaFit`, `FrameStyle`, `BackgroundType`, `FRAME_STYLES`, `MediaBox`, `ShadowOptions`, `BorderOptions`, `TiltOptions`, `ChromeOptions`, `ChromeRender`.
- Functions: `frameLayout(style)`, `makePreviewUrl(file)`, `getMediaKind(file)`, `extForFile(file, kind)`, `decodeImage(src)`, `renderChrome(opts, extra?)`, `exportImage(...)`, `exportGif(...)`, `exportVideo(...)`.
- Many helpers are module-private (`makeFill`, `projectTilt`, `warpInto`, `getPerspectiveTransform`, `solveLinear`, `invert3`, `drawTexturedTriangle`, `drawBar`, `drawTitle`, `drawMedia`, `drawCover`, `roundedRectPath`, `newCanvas`, `toBlob`, etc.).

## Key API shapes
- `ChromeOptions`: width/height/padding/style, outerBackground (CSS color or `linear-gradient`), windowBackground/radius, title + typography, `shadow`/`border`/`tilt`, optional `browserUrl`, `backgroundImageUrl`/`backgroundImageFit`.
- `ChromeRender`: `{ width, height, base: HTMLCanvasElement, composite(ctx, media, mw, mh, radius, fit) }` — `base` is painted first each frame, then `composite` paints the media (and warps when tilted).

## Important logic / algorithms
- `frameLayout(style)`: per-style `{ hasWindow, headerH }` (macOS 44, windows 40, browser 50, minimal 0, none no-window) — shared with the DOM preview.
- `makePreviewUrl(file)`: downscales stills to `PREVIEW_MAX_DIM` (1400) JPEG blob URLs (memory defense); returns a plain object URL for GIFs/small images or on failure; releases the bitmap/canvas.
- `makeFill`: parses `linear-gradient(<dir|deg>?, stops…)` into a `CanvasGradient` (handles `to <dir>` via `directionToAngle`, top-level comma splitting so `rgb()` stays intact, per-stop positions); non-gradients treated as solid.
- 3D perspective warp: Canvas 2D is affine-only, so a true tilt is a homography drawn as a fine grid of texture-mapped triangles. `projectTilt` places the window's 4 corners exactly as CSS `perspective() rotateX/Y/Z()` would; `getPerspectiveTransform` solves the homography (`solveLinear` Gaussian elimination); `warpInto` subdivides into an N×N grid and draws two triangles per cell via `drawTexturedTriangle` (`invert3` + `setTransform` + clip, with `expandTri` to hide seams).
- `renderChrome`: paints scene background (image cover/contain, or CSS color/gradient, or transparent to preserve PNG alpha); for `none` style returns a direct media box; else draws a blurred (Canvas blur ≈ CSS blur/2) rounded, optionally-warped drop shadow, then the window chrome (fill, `drawBar` title bar/traffic-lights/Windows controls/browser URL pill, border) into a local canvas; returns a `composite` that either draws media onto baked chrome (untilted) or composites chrome+media into a scratch canvas and `warpInto`s it (tilted).
- `exportImage`: composites once from the full-quality original (prefers `createImageBitmap` off-thread, falls back to `<img>`); exports in the original MIME (`imageMime`), PNG lossless else quality 0.92.
- `exportGif`: decodes frames with `gifuct-js` (full disposal handling: types 2 restore-to-bg, 3 restore-to-previous, rebuilt from patch + accumulator), composites the scene onto each frame, downscales to `MAX_GIF_DIM` (800), re-encodes via `gif.js` (2 workers, FloydSteinberg-serpentine dither, loop forever), yielding to the UI periodically; reports progress.
- `exportVideo`: plays the source `<video>` muted, draws scene+frame to a canvas per `requestAnimationFrame`, records `out.captureStream(30)` with `MediaRecorder` (VP9 if supported, else webm), resolves the recorded Blob on stop; reports progress by `currentTime/duration`.
- Aggressive memory hygiene: canvases zeroed (`c.width = c.height = 0`) after use; bitmaps closed; object URLs revoked.

## Relationships
- Consumed by `ImageFramer` (settings → `ChromeOptions`) and the `FramerExportContext` queue (which drives `exportImage/Gif/Video`). `FRAME_STYLES`/`frameLayout` are shared with the DOM preview so output matches the WYSIWYG.
- Uses `gif.js` (+ worker URL) and `gifuct-js`.

## Edge cases & known limitations
- GIF/video output is capped/re-encoded (GIF ≤ 800px longest edge, video → WebM) — not lossless.
- Perspective warp is a triangle-grid approximation (detail default 22); extreme tilts/perspective may show minor artifacts.
- Video export duration ≈ source playback duration (real-time capture).
- Transparent background only preserved by PNG stills; other formats fall back to opaque.
