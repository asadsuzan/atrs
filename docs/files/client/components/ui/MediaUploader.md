# `client/src/components/ui/MediaUploader.tsx`
**Purpose:** Drag-and-drop / click / clipboard-paste media upload zone with single or multiple support, previews (image/video), per-file failure handling, and a "Browse Library" path into the media library dialog.
**Language / Size:** TSX / 10141 bytes

## Exports
- `MediaUploader(props: MediaUploaderProps)` (named component).

## Props (`MediaUploaderProps`)
- `value?: string | string[]` — current URL(s).
- `onChange: (url: any) => void` — emits a string (single) or string[] (multiple).
- `onUploadStart?: () => void`.
- `onUploadComplete?: (urls: string | string[], files: File | File[]) => void` — library selections pass `[]`/empty for files.
- `onUploadError?: (error: Error) => void` — fired per failed file.
- `accept?: string` (default `'image/*,video/*'`).
- `className?: string`.
- `label?: string` (default drag/drop prompt).
- `multiple?: boolean` (default `false`).

## State / Refs / Context consumed
- State: `isDragging`, `isUploading`, `isLibraryOpen`.
- Refs: `fileInputRef` (hidden `<input type=file>`), `containerRef` (drop zone), `isHoveredOrFocusedRef` (paste gating), `handleFilesUploadRef` (latest upload closure).

## Imports (Internal / External)
- Internal: `uploadFile` (`../../services/api`), `Button` (`./button`), `MediaLibraryDialog` (`../media/MediaLibraryDialog`), `cn` (`@/lib/utils`).
- External: `toast` (sonner); lucide-react (`Image as ImageIcon, FileVideo, Loader2, X, FolderOpen`); react (`useState, useRef, useEffect`).

## Behavior / Rendering
- A window `paste` listener is registered **once** on mount; it only acts when this uploader is hovered or focused (`isHoveredOrFocusedRef` / `document.activeElement === containerRef`). It collects image/video clipboard items and calls `handleFilesUploadRef.current` — the ref is refreshed every render so the once-registered listener always runs the current closure (avoids a stale-`value`/`onChange` bug that would wipe other form fields).
- Drag over/leave toggles `isDragging` (border/background highlight). Drop and file-select both funnel to `handleFilesUpload`, slicing to one file unless `multiple`.
- `handleFilesUpload` uploads via `Promise.allSettled(files.map(uploadFile))` so one failure doesn't discard the rest; splits into fulfilled URLs and failures. Failures are logged, toasted per file, and reported via `onUploadError`. Successes: multiple → appends to existing `value` array; single → replaces. Resets the file input in `finally`.
- Rendering states: uploading spinner; else if `hasValue` a horizontally scrollable strip of previews (video → `FileVideo` tile, image → `<img>`) each with a hover destructive remove button (`handleClear(e, idx)`); else the empty prompt with icons, label, "or paste from clipboard" hint, and a "Browse Library" button.
- The container is clickable (opens file dialog unless uploading), keyboard-activatable (Enter/Space), and `tabIndex=0` with focus ring.
- Always renders `MediaLibraryDialog`; its `onSelect` appends (multiple) or replaces (single) and fires `onUploadComplete` with empty file args.

## Functions & handlers
- `handleDragOver/Leave/Drop`, `handleFileSelect`, `handleFilesUpload` (async), `handleClear(e, indexToRemove?)`, `isVideo(url)` (regex `\.(mp4|webm|ogg)$`).
- Derived: `hasValue`, `values` (normalized array for rendering).

## Relationships
- No contexts. Depends on `services/api.uploadFile` and `components/media/MediaLibraryDialog`. Used in product/activity/changelog forms.

## Edge cases & known limitations
- `onChange` is typed `(url: any)`, deferring the string-vs-array contract to the caller/`multiple` flag.
- `isVideo` detection is extension-based only; URLs without a known extension render as `<img>`.
- The paste listener is global; the hover/focus gate is what scopes it to this instance (multiple uploaders on a page all listen but self-filter).
