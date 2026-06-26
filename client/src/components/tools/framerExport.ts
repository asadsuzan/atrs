// Compositing exporters for the Image Framer.
//
// The component renders the macOS "chrome" (window, title bar, gradient padding)
// to a W×H canvas via html2canvas, with the media area left empty. These helpers
// then draw the actual media on top — once for a still image, or once per frame
// for an animated GIF / video — and re-encode so the output keeps its type:
//   image → original format (png/jpg/webp), gif → animated gif, video → webm.

import GIF from 'gif.js';
import gifWorkerUrl from 'gif.js/dist/gif.worker.js?url';
import { parseGIF, decompressFrames } from 'gifuct-js';
import type { ParsedFrame } from 'gifuct-js';

export type MediaKind = 'image' | 'gif' | 'video';
export type MediaFit = 'contain' | 'cover';

/** Destination rectangle (in chrome-canvas pixels) the media is fitted into. */
export interface MediaBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function getMediaKind(file: File): MediaKind {
  if (file.type === 'image/gif') return 'gif';
  if (file.type.startsWith('video/')) return 'video';
  return 'image';
}

/** Output file extension, preserving the original for still images. */
export function extForFile(file: File, kind: MediaKind): string {
  if (kind === 'gif') return 'gif';
  if (kind === 'video') return 'webm';
  const m = file.name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : 'png';
}

/** MIME type for a still-image canvas export (jpg/png/webp keep their format). */
function imageMime(file: File): string {
  if (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp') {
    return file.type;
  }
  if (/\.jpe?g$/i.test(file.name)) return 'image/jpeg';
  if (/\.webp$/i.test(file.name)) return 'image/webp';
  return 'image/png';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ── Canvas chrome rendering ────────────────────────────────────────────────
// We draw the macOS window chrome directly with the Canvas API instead of
// rasterizing the DOM, which gives pixel-perfect output (no html2canvas
// letter-spacing / shadow / transform artifacts).

type Align = 'left' | 'center' | 'right';

export interface ChromeOptions {
  width: number;
  height: number;
  padding: number;
  outerBackground: string;
  windowBackground: string;
  title: string;
  titleColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  textAlign: Align;
}

// Layout constants mirror the DOM preview (rounded-xl, h-11 header, px-8/pb-8…).
const WINDOW_RADIUS = 12;
const HEADER_H = 44;
const DOT_R = 6;
const DOT_GAP = 8;
const DOT_LEFT = 16; // header px-4
const TITLE_INSET = 80; // header px-4 (16) + title px-16 (64)
const MEDIA_PAD = 32; // px-8 / pb-8

/** Split on top-level commas only (so rgb()/rgba() stay intact). */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function directionToAngle(dir: string): number {
  const d = dir.replace(/^to\s+/i, '').trim().toLowerCase();
  const map: Record<string, number> = {
    top: 0,
    'top right': 45,
    'right top': 45,
    right: 90,
    'bottom right': 135,
    'right bottom': 135,
    bottom: 180,
    'bottom left': 225,
    'left bottom': 225,
    left: 270,
    'top left': 315,
    'left top': 315,
  };
  return map[d] ?? 180;
}

/**
 * Resolve a CSS color or simple linear-gradient() into a canvas fill.
 * Handles `linear-gradient(<dir|angle>?, c1 [%]?, c2 [%]?, …)`; anything else
 * is treated as a solid color string.
 */
function makeFill(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
): string | CanvasGradient {
  const v = value.trim();
  const m = v.match(/^linear-gradient\((.*)\)$/is);
  if (!m) return v;

  const parts = splitTopLevel(m[1]).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return '#ffffff';

  let angle = 180;
  let start = 0;
  const first = parts[0];
  if (/^to\s+/i.test(first)) {
    angle = directionToAngle(first);
    start = 1;
  } else if (/^-?[\d.]+deg$/i.test(first)) {
    angle = parseFloat(first);
    start = 1;
  }

  const stopParts = parts.slice(start);
  if (stopParts.length === 0) return '#ffffff';

  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const len = Math.abs(w * dx) + Math.abs(h * dy); // CSS gradient-line length
  const half = len / 2;
  const grad = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);

  stopParts.forEach((sp, i) => {
    const pm = sp.match(/^(.*?)(?:\s+([\d.]+)%)?$/);
    const color = (pm?.[1] ?? sp).trim();
    const pos = pm?.[2] !== undefined ? parseFloat(pm[2]) / 100 : i / Math.max(1, stopParts.length - 1);
    try {
      grad.addColorStop(Math.min(1, Math.max(0, pos)), color);
    } catch {
      /* ignore an unparseable stop */
    }
  });
  return grad;
}

/**
 * Draw the full frame chrome to a fresh W×H canvas and return it along with the
 * rectangle where the media should be composited.
 */
export function renderChrome(opts: ChromeOptions): { canvas: HTMLCanvasElement; box: MediaBox } {
  const { width: W, height: H, padding } = opts;
  const canvas = newCanvas(W, H);
  const ctx = canvas.getContext('2d')!;

  const wl = padding;
  const wt = padding;
  const ww = Math.max(1, W - padding * 2);
  const wh = Math.max(1, H - padding * 2);
  const radius = Math.min(WINDOW_RADIUS, ww / 2, wh / 2);

  // Outer background.
  ctx.fillStyle = makeFill(ctx, opts.outerBackground, 0, 0, W, H);
  ctx.fillRect(0, 0, W, H);

  // Window.
  roundedRectPath(ctx, wl, wt, ww, wh, radius);
  ctx.fillStyle = opts.windowBackground;
  ctx.fill();

  // Traffic-light dots.
  const dotColors = ['#ff5f56', '#ffbd2e', '#27c93f'];
  const dotCy = wt + HEADER_H / 2;
  dotColors.forEach((color, i) => {
    const dotCx = wl + DOT_LEFT + DOT_R + i * (DOT_R * 2 + DOT_GAP);
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(dotCx, dotCy, DOT_R, 0, Math.PI * 2);
    ctx.fill();
  });

  // Title.
  if (opts.title) {
    ctx.fillStyle = opts.titleColor;
    ctx.font = `${opts.fontWeight} ${opts.fontSize}px ${opts.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = opts.textAlign;
    // letterSpacing is supported in modern Canvas2D but not always typed.
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${opts.letterSpacing}px`;
    const tx =
      opts.textAlign === 'center'
        ? wl + ww / 2
        : opts.textAlign === 'right'
          ? wl + ww - TITLE_INSET
          : wl + TITLE_INSET;
    ctx.fillText(opts.title, tx, dotCy);
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';
  }

  const box: MediaBox = {
    x: wl + MEDIA_PAD,
    y: wt + HEADER_H,
    w: ww - MEDIA_PAD * 2,
    h: wh - HEADER_H - MEDIA_PAD,
  };
  return { canvas, box };
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Draw `source` (sized mw×mh) into `box`, rounded.
 * - contain: whole media visible, letterboxed within the box.
 * - cover: media fills the box, overflow cropped (clipped to the box).
 */
function drawMedia(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  mw: number,
  mh: number,
  box: MediaBox,
  radius: number,
  fit: MediaFit,
) {
  if (mw <= 0 || mh <= 0) return;
  const scale = fit === 'cover'
    ? Math.max(box.w / mw, box.h / mh)
    : Math.min(box.w / mw, box.h / mh);
  const w = mw * scale;
  const h = mh * scale;
  const x = box.x + (box.w - w) / 2;
  const y = box.y + (box.h - h) / 2;
  ctx.save();
  // For cover, clip to the box; for contain, clip to the (smaller) media rect.
  if (fit === 'cover') {
    roundedRectPath(ctx, box.x, box.y, box.w, box.h, radius);
  } else {
    roundedRectPath(ctx, x, y, w, h, radius);
  }
  ctx.clip();
  ctx.drawImage(source, x, y, w, h);
  ctx.restore();
}

function newCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
      mime,
      quality,
    );
  });
}

/** Still image: composite once, export in the original format. */
export async function exportImage(
  chrome: HTMLCanvasElement,
  box: MediaBox,
  previewUrl: string,
  file: File,
  radius: number,
  fit: MediaFit,
): Promise<Blob> {
  const img = await loadImage(previewUrl);
  const out = newCanvas(chrome.width, chrome.height);
  const ctx = out.getContext('2d')!;
  ctx.drawImage(chrome, 0, 0);
  drawMedia(ctx, img, img.naturalWidth, img.naturalHeight, box, radius, fit);
  const mime = imageMime(file);
  return toBlob(out, mime, mime === 'image/png' ? undefined : 0.92);
}

/** Animated GIF: composite the chrome onto every decoded frame, re-encode as GIF. */
export async function exportGif(
  chrome: HTMLCanvasElement,
  box: MediaBox,
  file: File,
  radius: number,
  fit: MediaFit,
  quality = 5,
  onProgress?: (fraction: number) => void,
): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const parsed = parseGIF(buffer);
  const frames: ParsedFrame[] = decompressFrames(parsed, true);
  const lw = parsed.lsd.width;
  const lh = parsed.lsd.height;

  // Accumulator that rebuilds each full GIF frame from its patch + disposal.
  const acc = newCanvas(lw, lh);
  const accCtx = acc.getContext('2d')!;
  const patchCanvas = newCanvas(lw, lh);
  const patchCtx = patchCanvas.getContext('2d')!;

  const out = newCanvas(chrome.width, chrome.height);
  const outCtx = out.getContext('2d')!;

  const encoder = new GIF({
    workers: 2,
    quality, // lower = better (1 best / 30 fast)
    dither: 'FloydSteinberg-serpentine', // smooths the gradient/screenshot banding
    width: chrome.width,
    height: chrome.height,
    workerScript: gifWorkerUrl,
    repeat: 0, // loop forever, like the source
  });

  // Full GIF disposal handling so optimized (partial-patch) GIFs don't ghost
  // or appear to drop frames: 2 = restore to background, 3 = restore to previous.
  let prevDisposal = 0;
  let prevDims: ParsedFrame['dims'] | null = null;
  let savedState: ImageData | null = null;

  for (const frame of frames) {
    if (prevDisposal === 3 && savedState) {
      accCtx.putImageData(savedState, 0, 0);
    } else if (prevDisposal === 2 && prevDims) {
      accCtx.clearRect(prevDims.left, prevDims.top, prevDims.width, prevDims.height);
    }
    if (frame.disposalType === 3) {
      savedState = accCtx.getImageData(0, 0, lw, lh);
    }

    // Paint this frame's patch via a temp canvas so transparency composites correctly.
    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    const imageData = patchCtx.createImageData(frame.dims.width, frame.dims.height);
    imageData.data.set(frame.patch);
    patchCtx.putImageData(imageData, 0, 0);
    accCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

    prevDisposal = frame.disposalType;
    prevDims = frame.dims;

    // Composite chrome + the full accumulated frame, then queue it.
    outCtx.clearRect(0, 0, out.width, out.height);
    outCtx.drawImage(chrome, 0, 0);
    drawMedia(outCtx, acc, lw, lh, box, radius, fit);
    encoder.addFrame(out, { copy: true, delay: frame.delay || 100 });
  }

  return new Promise<Blob>((resolve, reject) => {
    if (onProgress) encoder.on('progress', onProgress);
    encoder.on('finished', resolve);
    encoder.on('abort', () => reject(new Error('GIF encoding aborted')));
    encoder.render();
  });
}

/** Video: draw chrome + each video frame to a canvas and record the stream as WebM. */
export async function exportVideo(
  chrome: HTMLCanvasElement,
  box: MediaBox,
  previewUrl: string,
  radius: number,
  fit: MediaFit,
  bitrate?: number,
  onProgress?: (fraction: number) => void,
): Promise<Blob> {
  const video = document.createElement('video');
  video.src = previewUrl;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video'));
  });

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const out = newCanvas(chrome.width, chrome.height);
  const ctx = out.getContext('2d')!;

  const stream = out.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, bitrate ? { mimeType, videoBitsPerSecond: bitrate } : { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const finished = new Promise<Blob>(resolve => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
  });

  recorder.start();
  await video.play();

  await new Promise<void>(resolve => {
    let stopped = false;
    const finish = () => {
      if (stopped) return;
      stopped = true;
      resolve();
    };
    const draw = () => {
      ctx.clearRect(0, 0, out.width, out.height);
      ctx.drawImage(chrome, 0, 0);
      drawMedia(ctx, video, vw, vh, box, radius, fit);
      if (onProgress && video.duration) onProgress(Math.min(1, video.currentTime / video.duration));
      if (video.ended || video.paused) {
        finish();
        return;
      }
      requestAnimationFrame(draw);
    };
    video.onended = finish;
    requestAnimationFrame(draw);
  });

  recorder.stop();
  return finished;
}
