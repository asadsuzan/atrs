# Image Framer

**Summary:** A client-only screenshot beautifier that wraps uploaded images/GIFs/videos in configurable window "chrome" (frame style, background, shadow, 3D tilt, title typography) with a live WYSIWYG preview, then exports each item pixel-stable to its original image format, an animated GIF, or a WebM video via a global, route-independent download queue.

## User-facing entry points
- **Readme Tools page** at `/readme-tools` (`ReadmeTools`): the "Image Framer" tab renders `<ImageFramer/>` inline, and an "Open in window" button launches the same component in a draggable Window Manager window (`openWindow({ id: 'image-framer', ... })`).
- **Global export dock:** `FramerExportBoard` renders once at the app root (bottom dock, `DockBoard id="framer-export"`) so an in-flight export keeps running and stays visible across navigation; it collapses to a compact progress pill.

## Client pieces
- **UI component:** `client/src/components/tools/ImageFramer.tsx` — the editor: two-column layout with a sticky settings aside (Canvas / Frame / Effects / Text tabs) and a scaled `PreviewChrome` DOM preview; drag-and-drop / file-input uploads; per-item editable titles; a Download popover (`DownloadPanel`) with quality (standard/high) and separate-files-vs-zip options.
- **Export engine:** `client/src/components/tools/framerExport.ts` — the Canvas-API compositing engine. Exposes `frameLayout`, `makePreviewUrl`, `getMediaKind`, `extForFile`, `decodeImage`, `renderChrome`, `exportImage`, `exportGif`, `exportVideo`, plus `FRAME_STYLES` and the `ChromeOptions`/`ChromeRender` types. Non-React module; imported dynamically to keep gif.js/gifuct-js out of the main bundle.
- **Job board view:** `client/src/components/tools/FramerExportBoard.tsx` — a pure view over the queue (phase label, done/total, per-job progress rows, minimize/cancel/dismiss); consumes `JobDockContext` for docking.
- **Queue context:** `client/src/contexts/FramerExportContext.tsx` — `FramerExportProvider` + `useFramerExport()`. Owns `jobs`, `phase` (`idle|processing|packaging|downloading|done|cancelled|error`), `isMinimized`, `isRunning`, and actions `start/cancel/dismiss/minimize/restore`; also exports `KIND_META`. Runs the sequential render pipeline and downloads via `file-saver` (`saveAs`), zipping multiple outputs with `jszip`.
- **Accent-color util:** `client/src/lib/imageColor.ts` — `extractAccentColor(url)` samples a 32×32 canvas to pick a saturation-weighted dominant color (with near-white/black/low-sat rejection, average fallback, mid-range normalization, per-URL cache). Note: per its doc it is consumed by the presentation/report deck's "dynamic accent" mode, not by the framer UI itself.
- **Type shim:** `client/src/types/gif.js.d.ts` — ambient declaration for the untyped `gif.js` (`GIF` class, `GIFOptions`, `AddFrameOptions`, event `on` overloads) enabling typed GIF encoding.
- **Contexts:** `FramerExportContext` (queue), `WindowManagerContext` (open framer as a window), `JobDockContext` (dock the board). No React Query — this feature makes no API calls.

## Server pieces
None — client-only feature. All uploading, compositing, encoding, and downloading happen in the browser; no ATRS API endpoint is involved. (The `/readme-tools` page hosts other tools that do use a server proxy, but the Image Framer itself does not.)

## Data model
None — client-only feature. Uploaded files stay in-memory as `File`/object-URL previews; outputs are downloaded blobs (individual files or a `framed-media.zip`) and are never persisted server-side.

## Notable behaviors & edge cases
- **WYSIWYG parity:** the DOM `PreviewChrome` is cosmetic; visual fidelity depends on `framerExport.renderChrome` reproducing the shared `frameLayout`/`FRAME_STYLES` constants (macOS 44px / Windows 40px / browser 50px / minimal 0 header heights).
- **3D tilt is a homography:** Canvas 2D is affine-only, so tilt is drawn as a fine grid (default detail 22) of texture-mapped triangles — `projectTilt` matches CSS `perspective() rotateX/Y/Z`, `getPerspectiveTransform` solves the homography via Gaussian elimination, `warpInto` subdivides and draws two triangles per cell. Extreme tilts can show minor seam artifacts.
- **Per-kind export paths:** images export in the original MIME (PNG lossless else quality 0.92, preferring off-thread `createImageBitmap`); GIFs are decoded with `gifuct-js` (full frame-disposal handling), composited per frame, downscaled to ≤800px longest edge, and re-encoded via `gif.js` (2 workers, Floyd–Steinberg dither, loop forever); videos are captured in real time via `MediaRecorder` on `canvas.captureStream(30)` (VP9 if supported, else WebM).
- **Quality knob** only affects motion output: GIF quality 3 (high) vs 10 (standard), video bitrate 10 Mbps (high) vs 3 Mbps (standard); warp grid is finer for stills (24) than motion (12, re-warped per frame).
- **Transparency** is preserved only by PNG stills; other formats fall back to opaque.
- **Cooperative cancellation:** `cancelRef` (a `useRef` synchronous latch) is checked between items so `cancel()` halts the loop without waiting for a re-render.
- **Memory hygiene:** previews are generated one at a time and downscaled (`makePreviewUrl` → ≤1400px JPEG blob URLs) to avoid OOM on large batches; canvases are zeroed and bitmaps/object-URLs released after use. Very large batches or long videos still stress the browser (video export runs in real time ≈ source duration).
- **Bundle splitting:** the encoder module is loaded via dynamic `import()` inside `start()`; `import type` for its types costs nothing at runtime.
- **Accent-color caveats:** `extractAccentColor` returns `null` gracefully on load error, tainted (cross-origin without CORS) canvas, or fully transparent images; its per-URL cache is unbounded for the session and it is not SSR-safe.

## Related docs
- [ImageFramer](../files/client/components/tools/ImageFramer.md)
- [FramerExportBoard](../files/client/components/tools/FramerExportBoard.md)
- [framerExport engine](../files/client/components/tools/framerExport.md)
- [FramerExportContext](../files/client/contexts/FramerExportContext.md)
- [imageColor](../files/client/lib/imageColor.md)
- [gif.js.d type shim](../files/client/types/gif.js.d.md)
- [ReadmeTools page](../files/client/pages/ReadmeTools.md)
