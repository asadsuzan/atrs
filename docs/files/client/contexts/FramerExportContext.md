# `client/src/contexts/FramerExportContext.tsx`
**Purpose:** Owns the Image Framer download queue. Lives at the app root (above the router) so an in-flight export keeps running (and the job board keeps showing) across navigation. Composites each media item onto a canvas "chrome" scene, re-encodes it (image / GIF / WebM video), and downloads results individually or as a zip.
**Language / Size:** TSX / 7521 bytes

## Exports (Provider, hook, types, functions)
- `KIND_META: Record<MediaKind, { label: string; Icon: typeof ImageIcon }>` — human labels + lucide icons per media kind (image/gif/video).
- `JobStatus`, `DownloadJob`, `DownloadPhase`, `ExportItem`, `ExportRequest` — exported types.
- `useFramerExport()` — hook; throws `'useFramerExport must be used within FramerExportProvider'`.
- `FramerExportProvider({ children })` — provider.
- `FramerExportContextValue` — interface (internal).

## Imports (Internal / External)
Internal:
- `type ChromeOptions, MediaFit, MediaKind` from `../components/tools/framerExport` (types only — the heavy module is imported dynamically at runtime).

External:
- `react` (`createContext`, `useContext`, `useRef`, `useState`, `type ReactNode`)
- `lucide-react` (`Image as ImageIcon`, `Film`, `Video`)
- `jszip` (`JSZip`)
- `file-saver` (`saveAs`)
- `sonner` (`toast`)

## Context shape (the value object)
```ts
interface FramerExportContextValue {
  jobs: DownloadJob[];
  phase: DownloadPhase;   // 'idle'|'processing'|'packaging'|'downloading'|'done'|'cancelled'|'error'
  isMinimized: boolean;
  isRunning: boolean;
  start: (req: ExportRequest) => void;
  cancel: () => void;
  dismiss: () => void;
  minimize: () => void;
  restore: () => void;
}
```
Key data types:
```ts
type JobStatus = 'pending' | 'rendering' | 'done' | 'error';
interface DownloadJob { id; name; kind: MediaKind; previewUrl; status: JobStatus; progress: number; } // progress 0..1
interface ExportItem { id; file: File; previewUrl; title; }
interface ExportRequest {
  chromeBase: Omit<ChromeOptions, 'title'>;  // shared chrome; per-item title applied per frame
  radius: number; fit: MediaFit;
  quality: 'standard' | 'high';
  separateFiles: boolean;
  items: ExportItem[];
}
```

## State managed & how it's updated
- `jobs: DownloadJob[]` (init `[]`) — one per item; seeded on start, patched via `updateJob(id, patch)`.
- `phase: DownloadPhase` (init `'idle'`) — walks processing → packaging/downloading → done (or cancelled/error).
- `isMinimized` (init `false`), `isRunning` (init `false`).
- `cancelRef: boolean` (`useRef`) — synchronous cancel flag checked in the render loop.

## Hooks & Effects (deps, purpose, WHY)
No `useEffect`. `cancelRef` (useRef) is a synchronous latch so `cancel()` is observed mid-loop without waiting for a re-render.

## Functions (purpose, algorithm, side effects)
- `updateJob(id, patch)` — immutable per-job merge into `jobs`.
- `start(req)` — the core pipeline:
  1. Guards: no-op if `isRunning` or no items. Resets `cancelRef=false`, sets running, un-minimizes, phase `'processing'`.
  2. **Dynamically imports** `../components/tools/framerExport` (`const fx = await import(...)`) to keep gif.js/gifuct out of the main bundle.
  3. Decodes optional background image once (`fx.decodeImage`), falling back silently on failure.
  4. Seeds `jobs` (all `pending`).
  5. Loops items sequentially: skip if cancelled; mark `rendering`; call `renderOne`; on result push + mark `done`, else mark `error`; catch → mark `error`.
  6. If cancelled → phase `'cancelled'`. If no results → phase `'error'` + toast. If single or `separateFiles` → phase `'downloading'`, `saveAs` each. Else → phase `'packaging'`, build a `JSZip`, `generateAsync({type:'blob'})`, then `saveAs(zip, 'framed-media.zip')`. Set phase `'done'`.
  7. `finally` → `isRunning=false`.
  - `renderOne(item, onProgress)` — awaits `document.fonts.load(...)` (non-fatal), detects kind via `fx.getMediaKind`, builds `fx.renderChrome({...chromeBase, title}, { bgImage, warpDetail: image?24:12 })`, then encodes:
    - gif → `fx.exportGif(render, file, radius, fit, quality==='high'?3:10, onProgress)`
    - video → `fx.exportVideo(render, previewUrl, radius, fit, bitrate, onProgress)` (bitrate 10M high / 3M standard)
    - image → `fx.exportImage(render, file, radius, fit)` then `onProgress(1)`
  - Output name: `framed-<base>.<ext>` (`fx.extForFile`).
- `cancel()` — `cancelRef.current = true`.
- `dismiss()` — clear jobs, phase `'idle'`, un-minimize.
- `minimize()` / `restore()` — toggle `isMinimized`.

## Consumed by
`components/tools/FramerExportBoard.tsx`, `components/tools/ImageFramer.tsx` (both also use `KIND_META`).

## Important logic & design patterns
- Code-splitting the encoders via dynamic `import()` inside `start()` (comment: keeps gif.js/gifuct out of the main bundle; `import type` for the types costs nothing).
- Synchronous `cancelRef` latch for cooperative cancellation of a `for` loop.
- Per-item quality tuning: finer warp grid (24) for stills vs coarser (12) for motion (re-warped per frame); GIF quality and video bitrate scale with the `quality` setting.
