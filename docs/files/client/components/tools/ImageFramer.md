# `client/src/components/tools/ImageFramer.tsx`
**Purpose:** The Image Framer tool UI: upload images/GIFs/videos, wrap each in a configurable window "chrome" (frame style, background, shadow, 3D tilt, title typography, output size) with a live WYSIWYG preview, then hand the batch to the global export queue for pixel-stable download.
**Language / Size:** TypeScript(React) / 44631 bytes

## Exports
- `ImageFramer()` (named component, no props).
- Module-private helpers/components: `Field`, `SectionHeader`, `ColorField`, `SliderRow`, `Segmented`, `DownloadPanel`, `PreviewChrome`, plus constants (`FONT_OPTIONS`, `WEIGHT_OPTIONS`, `SIZE_PRESETS`, `GRADIENT_PRESETS`, `SOLID_PRESETS`, `TILT_PRESETS`, `CHECKER_STYLE`) and utils `hexToRgba`, `parseGradient`.

## Props
- None.

## State / Hooks
- `images: FramedImage[]` ({ id, file, previewUrl, title }); `frameTitle` (default applied to new uploads).
- Title typography: `fontFamily, fontSize, fontWeight, letterSpacing, textAlign, titleColor`.
- Frame/window: `frameStyle, windowBackground, windowRadius, imageRadius, mediaFit, borderWidth, borderColor, browserUrl`.
- Scene background: `bgType, gradAngle, gradC1, gradC2, solidColor, advancedCss, bgImageUrl, bgImageFit, padding`.
- Shadow: enabled/color/blur/spread/x/y/opacity. 3D tilt: rotateX/Y/Z, perspective.
- Output size: `outputWidth/outputHeight`; `activeTab`, `isDragging`; refs `fileInputRef`, `bgFileInputRef`, `previewRef`.
- `useFramerExport()` → `start, isRunning`. Download panel state: `downloadOpen, quality, separateFiles`.
- `useEffect`: `ResizeObserver` on the preview column → `previewWidth` (drives `previewScale`).

## Behavior / Rendering
- Two-column layout: a sticky settings `aside` with 4 tabs (Canvas/Frame/Effects/Text) and a preview column.
- Canvas tab: background type `Segmented` (gradient/solid/image/none) with presets + custom editors + advanced CSS; padding slider; output-size preset select + width/height inputs.
- Frame tab: frame style select, browser address-bar URL (browser style), window background, window/image corner radii, media fit (contain/cover), border width/color.
- Effects tab: shadow controls (blur/spread/offset/opacity/color) and 3D tilt presets + rotateX/Y/Z + perspective, with a Reset.
- Text tab: default title, font family/size/weight, letter spacing, alignment, title color.
- Preview: each image gets an editable per-item title and a fixed W×H scene scaled by `previewScale`, rendered by `PreviewChrome` (a DOM approximation of the export). Empty state is a drag-and-drop upload zone.
- Header (when images exist): item count, Clear all, and a Download `Popover` (`DownloadPanel`).

## Important logic / algorithms
- `addFiles`: filters to image/video, builds downscaled previews **one at a time** via `makePreviewUrl` (avoids decoding many huge photos at once → OOM).
- `outerBackground` resolves per `bgType` (solid color / transparent for none & image / advanced CSS or `linear-gradient(angle, c1, c2)`).
- `runDownload`: assembles a `chromeBase` (`ChromeOptions`) from all settings + per-item files and calls `start(...)` on the export context; closes the popover. The actual rendering uses the Canvas API in `framerExport.ts`, not this DOM preview.
- Object-URL lifecycle: previews are revoked on remove/clear and when replacing the background image.
- `PreviewChrome` mirrors `frameLayout` per style (macOS/Windows/browser bars, dots, address pill) and applies box-shadow + `perspective()` tilt via CSS; the exporter reproduces this exactly.
- `hexToRgba`/`parseGradient` bridge the color/gradient inputs to CSS and back.

## Relationships
- Exporter: `./framerExport` (`getMediaKind`, `makePreviewUrl`, `frameLayout`, `FRAME_STYLES`, types). Queue/job board: `FramerExportContext` (`useFramerExport`, `KIND_META`) + `FramerExportBoard`. UI primitives: tabs/select/slider/popover/checkbox.

## Edge cases & known limitations
- The DOM preview is cosmetic only; visual parity with the download depends on `framerExport.renderChrome` matching the layout constants.
- Memory-conscious by design (sequential preview generation, downscaled previews) but very large batches/videos still stress the browser.
- Standard vs high quality only affects GIF/video re-encode.
