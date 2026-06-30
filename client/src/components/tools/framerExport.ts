// Compositing exporters for the Image Framer.
//
// The component renders a fixed W×H "scene" — a background, then a window
// "chrome" (title bar, border, drop shadow) optionally tilted in 3D, with the
// media composited inside it. The DOM preview is purely cosmetic; the actual
// download is drawn here with the Canvas API so the output is pixel-stable and
// keeps each item's type: image → original format, gif → animated gif,
// video → webm.
//
// renderChrome() builds the static parts once (background, shadow, chrome) and
// returns a `composite()` closure that paints the per-frame media into place
// (and applies the same 3D warp). exportImage/Gif/Video drive that closure.

import GIF from 'gif.js';
import gifWorkerUrl from 'gif.js/dist/gif.worker.js?url';
import { parseGIF, decompressFrames } from 'gifuct-js';
import type { ParsedFrame } from 'gifuct-js';

export type MediaKind = 'image' | 'gif' | 'video';
export type MediaFit = 'contain' | 'cover';
export type FrameStyle = 'macos' | 'windows' | 'browser' | 'minimal' | 'none';
export type BackgroundType = 'gradient' | 'solid' | 'image' | 'none';

export const FRAME_STYLES: { value: FrameStyle; label: string }[] = [
  { value: 'macos', label: 'macOS' },
  { value: 'windows', label: 'Windows' },
  { value: 'browser', label: 'Browser' },
  { value: 'minimal', label: 'Minimal (no bar)' },
  { value: 'none', label: 'None (just background)' },
];

/** Per-style geometry shared by the canvas renderer and the DOM preview. */
export function frameLayout(style: FrameStyle): { hasWindow: boolean; headerH: number } {
  switch (style) {
    case 'windows':
      return { hasWindow: true, headerH: 40 };
    case 'browser':
      return { hasWindow: true, headerH: 50 };
    case 'minimal':
      return { hasWindow: true, headerH: 0 };
    case 'none':
      return { hasWindow: false, headerH: 0 };
    case 'macos':
    default:
      return { hasWindow: true, headerH: 44 };
  }
}

// Cap GIF output so a long, large GIF can't exhaust memory while encoding.
const MAX_GIF_DIM = 800;
// Preview thumbnails are downscaled to this longest edge to keep many uploads light.
const PREVIEW_MAX_DIM = 1400;

const yieldToUI = () => new Promise<void>(r => setTimeout(r, 0));

/**
 * Downscale a still image to a lightweight preview blob URL (keeps the original
 * File for full-quality export). This is the main defense against the browser
 * decoding many huge photos at full resolution and running out of memory.
 * Returns a plain object URL if the image is already small or on any failure.
 */
export async function makePreviewUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return URL.createObjectURL(file);
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PREVIEW_MAX_DIM / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1) {
      bitmap.close();
      return URL.createObjectURL(file);
    }
    const c = newCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
    c.getContext('2d')!.drawImage(bitmap, 0, 0, c.width, c.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(res => c.toBlob(res, 'image/jpeg', 0.85));
    c.width = c.height = 0; // release backing store
    return blob ? URL.createObjectURL(blob) : URL.createObjectURL(file);
  } catch {
    return URL.createObjectURL(file);
  }
}

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

/** Decode a (background) image URL to an element usable as a canvas source. */
export function decodeImage(src: string): Promise<HTMLImageElement> {
  return loadImage(src);
}

// ── Option shapes ───────────────────────────────────────────────────────────

type Align = 'left' | 'center' | 'right';

export interface ShadowOptions {
  enabled: boolean;
  color: string; // hex, e.g. #000000
  blur: number; // CSS box-shadow blur (px)
  spread: number; // CSS box-shadow spread (px)
  offsetX: number;
  offsetY: number;
  opacity: number; // 0..1
}

export interface BorderOptions {
  width: number; // 0 disables
  color: string;
}

export interface TiltOptions {
  rotateX: number; // deg
  rotateY: number; // deg
  rotateZ: number; // deg
  perspective: number; // px (CSS perspective())
}

export interface ChromeOptions {
  width: number;
  height: number;
  padding: number;
  style: FrameStyle;
  outerBackground: string; // CSS color or linear-gradient(...) — used unless a bg image is supplied
  windowBackground: string;
  windowRadius: number;
  title: string;
  titleColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  textAlign: Align;
  shadow: ShadowOptions;
  border: BorderOptions;
  tilt: TiltOptions;
  /** Browser-frame address-bar text (falls back to title). */
  browserUrl?: string;
  /** When set, the scene background is this image rather than outerBackground. */
  backgroundImageUrl?: string;
  backgroundImageFit?: MediaFit;
}

// Layout constants mirror the DOM preview (header heights, px-8/pb-8 media pad…).
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

// ── 3D perspective warp ──────────────────────────────────────────────────────
// Canvas 2D has only affine transforms, so a true perspective tilt is done by
// mapping the source onto a projected quad through a homography, drawn as a fine
// grid of texture-mapped triangles. The quad corners are computed exactly the
// way CSS `perspective() rotateX/Y/Z()` would place the window's four corners,
// so the export matches the live preview.

interface Pt {
  x: number;
  y: number;
}

function projectTilt(ww: number, wh: number, cx: number, cy: number, tilt: TiltOptions): Pt[] {
  const ax = (tilt.rotateX * Math.PI) / 180;
  const ay = (tilt.rotateY * Math.PI) / 180;
  const az = (tilt.rotateZ * Math.PI) / 180;
  const P = tilt.perspective;
  const local: [number, number][] = [
    [-ww / 2, -wh / 2],
    [ww / 2, -wh / 2],
    [ww / 2, wh / 2],
    [-ww / 2, wh / 2],
  ];
  return local.map(([lx, ly]) => {
    // rotateZ
    let x = lx * Math.cos(az) - ly * Math.sin(az);
    let y = lx * Math.sin(az) + ly * Math.cos(az);
    let z = 0;
    // rotateY
    const x2 = x * Math.cos(ay) + z * Math.sin(ay);
    const z2 = -x * Math.sin(ay) + z * Math.cos(ay);
    x = x2;
    z = z2;
    // rotateX
    const y2 = y * Math.cos(ax) - z * Math.sin(ax);
    const z3 = y * Math.sin(ax) + z * Math.cos(ax);
    y = y2;
    z = z3;
    // CSS perspective projection (camera at z = +P, origin at element centre)
    const f = P > 0 ? P / (P - z) : 1;
    return { x: cx + x * f, y: cy + y * f };
  });
}

/** Solve an n×n linear system by Gaussian elimination with partial pivoting. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const pv = M[col][col] || 1e-9;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / pv;
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-9));
}

/** Homography mapping the 4 source points to the 4 destination points. */
function getPerspectiveTransform(s: [number, number][], d: [number, number][]): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = s[i];
    const [X, Y] = d[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }
  const h = solveLinear(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/** Invert a 3×3 matrix; returns null if (near-)singular. */
function invert3(m: number[][]): number[][] | null {
  const [a, b, c] = m[0];
  const [d, e, f] = m[1];
  const [g, h, i] = m[2];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-9) return null;
  const inv = 1 / det;
  return [
    [(e * i - f * h) * inv, (c * h - b * i) * inv, (b * f - c * e) * inv],
    [(f * g - d * i) * inv, (a * i - c * g) * inv, (c * d - a * f) * inv],
    [(d * h - e * g) * inv, (b * g - a * h) * inv, (a * e - b * d) * inv],
  ];
}

/** Push a triangle's vertices outward from its centroid (hides grid seams). */
function expandTri(v: number[], amt: number): number[] {
  const cx = (v[0] + v[2] + v[4]) / 3;
  const cy = (v[1] + v[3] + v[5]) / 3;
  const out: number[] = [];
  for (let k = 0; k < 6; k += 2) {
    const dx = v[k] - cx;
    const dy = v[k + 1] - cy;
    const len = Math.hypot(dx, dy) || 1;
    out.push(v[k] + (dx / len) * amt, v[k + 1] + (dy / len) * amt);
  }
  return out;
}

function drawTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  s: number[], // [sx0,sy0,sx1,sy1,sx2,sy2]
  d: number[], // [dx0,dy0,dx1,dy1,dx2,dy2]
) {
  const M = invert3([
    [s[0], s[1], 1],
    [s[2], s[3], 1],
    [s[4], s[5], 1],
  ]);
  if (!M) return;
  const dx = [d[0], d[2], d[4]];
  const dy = [d[1], d[3], d[5]];
  const a = M[0][0] * dx[0] + M[0][1] * dx[1] + M[0][2] * dx[2];
  const c = M[1][0] * dx[0] + M[1][1] * dx[1] + M[1][2] * dx[2];
  const e = M[2][0] * dx[0] + M[2][1] * dx[1] + M[2][2] * dx[2];
  const b = M[0][0] * dy[0] + M[0][1] * dy[1] + M[0][2] * dy[2];
  const dd = M[1][0] * dy[0] + M[1][1] * dy[1] + M[1][2] * dy[2];
  const f = M[2][0] * dy[0] + M[2][1] * dy[1] + M[2][2] * dy[2];
  const ed = expandTri(d, 0.6);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ed[0], ed[1]);
  ctx.lineTo(ed[2], ed[3]);
  ctx.lineTo(ed[4], ed[5]);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(a, b, c, dd, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore(); // restores both clip and transform
}

/** Draw `src` onto `ctx`, mapped to the projected quad `corners` (perspective). */
function warpInto(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, corners: Pt[], N: number) {
  const sw = src.width;
  const sh = src.height;
  const H = getPerspectiveTransform(
    [
      [0, 0],
      [sw, 0],
      [sw, sh],
      [0, sh],
    ],
    corners.map(p => [p.x, p.y] as [number, number]),
  );
  const proj = (u: number, v: number): [number, number] => {
    const w = H[6] * u + H[7] * v + H[8];
    return [(H[0] * u + H[1] * v + H[2]) / w, (H[3] * u + H[4] * v + H[5]) / w];
  };
  const grid: { u: number; v: number; dx: number; dy: number }[][] = [];
  for (let i = 0; i <= N; i++) {
    const row: { u: number; v: number; dx: number; dy: number }[] = [];
    for (let j = 0; j <= N; j++) {
      const u = (sw * i) / N;
      const v = (sh * j) / N;
      const [dx, dy] = proj(u, v);
      row.push({ u, v, dx, dy });
    }
    grid.push(row);
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const a = grid[i][j];
      const b = grid[i + 1][j];
      const c = grid[i + 1][j + 1];
      const dd = grid[i][j + 1];
      drawTexturedTriangle(ctx, src, [a.u, a.v, b.u, b.v, c.u, c.v], [a.dx, a.dy, b.dx, b.dy, c.dx, c.dy]);
      drawTexturedTriangle(ctx, src, [a.u, a.v, c.u, c.v, dd.u, dd.v], [a.dx, a.dy, c.dx, c.dy, dd.dx, dd.dy]);
    }
  }
}

// ── Chrome rendering ─────────────────────────────────────────────────────────

type Align2 = Align;

function drawTitle(
  ctx: CanvasRenderingContext2D,
  opts: ChromeOptions,
  text: string,
  left: number,
  right: number,
  cy: number,
  align: Align2,
) {
  if (!text) return;
  ctx.fillStyle = opts.titleColor;
  ctx.font = `${opts.fontWeight} ${opts.fontSize}px ${opts.fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = align;
  const ls = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  ls.letterSpacing = `${opts.letterSpacing}px`;
  const tx = align === 'center' ? (left + right) / 2 : align === 'right' ? right : left;
  ctx.fillText(text, tx, cy);
  ls.letterSpacing = '0px';
}

/** Draw the title bar / controls into a window-local canvas (origin at 0,0). */
function drawBar(ctx: CanvasRenderingContext2D, opts: ChromeOptions, ww: number, headerH: number) {
  if (headerH <= 0) return;
  const cy = headerH / 2;
  if (opts.style === 'macos' || opts.style === 'browser') {
    ['#ff5f56', '#ffbd2e', '#27c93f'].forEach((color, i) => {
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(DOT_LEFT + DOT_R + i * (DOT_R * 2 + DOT_GAP), cy, DOT_R, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (opts.style === 'windows') {
    ctx.strokeStyle = opts.titleColor;
    ctx.lineWidth = 1.5;
    const gx = ww - 18;
    [0, 1, 2].forEach(i => {
      const x = gx - i * 22;
      if (i === 2) {
        ctx.beginPath();
        ctx.moveTo(x - 4, cy);
        ctx.lineTo(x + 4, cy);
        ctx.stroke();
      } else if (i === 1) {
        ctx.strokeRect(x - 4, cy - 4, 8, 8);
      } else {
        ctx.beginPath();
        ctx.moveTo(x - 4, cy - 4);
        ctx.lineTo(x + 4, cy + 4);
        ctx.moveTo(x + 4, cy - 4);
        ctx.lineTo(x - 4, cy + 4);
        ctx.stroke();
      }
    });
  }

  if (opts.style === 'browser') {
    const pillH = 26;
    const pillX = 72;
    const pillW = ww - 72 - 16;
    const pillY = (headerH - pillH) / 2;
    roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fillStyle = 'rgba(127,127,127,0.14)';
    ctx.fill();
    const url = opts.browserUrl?.trim() || opts.title;
    drawTitle(ctx, opts, url, pillX + 16, pillX + pillW - 16, pillY + pillH / 2, opts.textAlign === 'left' ? 'left' : 'center');
  } else if (opts.style === 'macos') {
    drawTitle(ctx, opts, opts.title, TITLE_INSET, ww - TITLE_INSET, cy, opts.textAlign);
  } else if (opts.style === 'windows') {
    drawTitle(ctx, opts, opts.title, 14, ww - 80, cy, 'left');
  }
}

/** A static scene + a per-frame media compositor that matches the live preview. */
export interface ChromeRender {
  width: number;
  height: number;
  /** Background + shadow (+ chrome, when un-tilted) — paint this first each frame. */
  base: HTMLCanvasElement;
  /** Paints `media` into the window (and applies the 3D warp). Assumes `base` is already drawn on `ctx`. */
  composite: (
    ctx: CanvasRenderingContext2D,
    media: CanvasImageSource,
    mw: number,
    mh: number,
    radius: number,
    fit: MediaFit,
  ) => void;
}

export function renderChrome(
  opts: ChromeOptions,
  extra?: { bgImage?: CanvasImageSource; warpDetail?: number },
): ChromeRender {
  const { width: W, height: H, padding } = opts;
  const { hasWindow, headerH } = frameLayout(opts.style);
  const detail = extra?.warpDetail ?? 22;

  const base = newCanvas(W, H);
  const bctx = base.getContext('2d')!;

  // Scene background: image (cover/contain) or CSS color/gradient. 'transparent'
  // leaves the canvas clear so PNG exports keep their alpha.
  if (extra?.bgImage) {
    drawCover(bctx, extra.bgImage, W, H, opts.backgroundImageFit ?? 'cover');
  } else if (opts.outerBackground.trim() !== 'transparent' && opts.outerBackground.trim() !== '') {
    bctx.fillStyle = makeFill(bctx, opts.outerBackground, 0, 0, W, H);
    bctx.fillRect(0, 0, W, H);
  }

  // "none": media sits directly on the padded background — no window/bar/tilt.
  if (!hasWindow) {
    const box: MediaBox = { x: padding, y: padding, w: Math.max(1, W - padding * 2), h: Math.max(1, H - padding * 2) };
    return {
      width: W,
      height: H,
      base,
      composite: (ctx, media, mw, mh, radius, fit) => drawMedia(ctx, media, mw, mh, box, radius, fit),
    };
  }

  const wl = padding;
  const wt = padding;
  const ww = Math.max(1, W - padding * 2);
  const wh = Math.max(1, H - padding * 2);
  const radius = Math.max(0, Math.min(opts.windowRadius, ww / 2, wh / 2));

  const tiltActive = !!(opts.tilt.rotateX || opts.tilt.rotateY || opts.tilt.rotateZ);
  const corners = tiltActive ? projectTilt(ww, wh, wl + ww / 2, wt + wh / 2, opts.tilt) : null;

  // Drop shadow (drawn before the window). A rounded silhouette is blurred and,
  // when tilted, warped to follow the window. Canvas filter blur ≈ CSS blur/2.
  if (opts.shadow.enabled && opts.shadow.opacity > 0 && (opts.shadow.blur > 0 || opts.shadow.spread > 0)) {
    const sp = Math.max(0, opts.shadow.spread);
    const sil = newCanvas(Math.max(1, Math.round(ww + sp * 2)), Math.max(1, Math.round(wh + sp * 2)));
    const sctx = sil.getContext('2d')!;
    roundedRectPath(sctx, 0, 0, sil.width, sil.height, radius + sp);
    sctx.fillStyle = opts.shadow.color;
    sctx.fill();

    bctx.save();
    bctx.globalAlpha = Math.min(1, Math.max(0, opts.shadow.opacity));
    bctx.filter = `blur(${Math.max(0, opts.shadow.blur * 0.5)}px)`;
    if (corners) {
      const tmp = newCanvas(W, H);
      const sCorners = projectTilt(ww + sp * 2, wh + sp * 2, wl + ww / 2, wt + wh / 2, opts.tilt);
      warpInto(tmp.getContext('2d')!, sil, sCorners, detail);
      bctx.drawImage(tmp, opts.shadow.offsetX, opts.shadow.offsetY);
      tmp.width = tmp.height = 0;
    } else {
      bctx.drawImage(sil, wl - sp + opts.shadow.offsetX, wt - sp + opts.shadow.offsetY);
    }
    bctx.restore();
    sil.width = sil.height = 0;
  }

  // Window chrome rendered into a local ww×wh canvas: fill, title bar, border.
  const win = newCanvas(ww, wh);
  const wctx = win.getContext('2d')!;
  roundedRectPath(wctx, 0, 0, ww, wh, radius);
  wctx.fillStyle = opts.windowBackground;
  wctx.fill();
  drawBar(wctx, opts, ww, headerH);
  if (opts.border.width > 0) {
    const bw = opts.border.width;
    wctx.save();
    roundedRectPath(wctx, bw / 2, bw / 2, ww - bw, wh - bw, Math.max(0, radius - bw / 2));
    wctx.lineWidth = bw;
    wctx.strokeStyle = opts.border.color;
    wctx.stroke();
    wctx.restore();
  }

  const topPad = headerH > 0 ? 0 : MEDIA_PAD;
  const localBox: MediaBox = {
    x: MEDIA_PAD,
    y: headerH + topPad,
    w: ww - MEDIA_PAD * 2,
    h: wh - headerH - topPad - MEDIA_PAD,
  };

  if (!corners) {
    // Bake the chrome into the base; media is composited per-frame on top.
    bctx.drawImage(win, wl, wt);
    win.width = win.height = 0;
    const finalBox: MediaBox = { x: localBox.x + wl, y: localBox.y + wt, w: localBox.w, h: localBox.h };
    return {
      width: W,
      height: H,
      base,
      composite: (ctx, media, mw, mh, radius2, fit) => drawMedia(ctx, media, mw, mh, finalBox, radius2, fit),
    };
  }

  // Tilted: chrome + media must be warped together each frame. A reusable
  // window-frame scratch canvas is composited (chrome + media) then warped.
  const wf = newCanvas(ww, wh);
  const wfctx = wf.getContext('2d')!;
  return {
    width: W,
    height: H,
    base,
    composite: (ctx, media, mw, mh, radius2, fit) => {
      wfctx.clearRect(0, 0, ww, wh);
      wfctx.drawImage(win, 0, 0);
      drawMedia(wfctx, media, mw, mh, localBox, radius2, fit);
      warpInto(ctx, wf, corners, detail);
    },
  };
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

/** Draw an image to fill (cover) or fit (contain) a W×H area, centered. */
function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, W: number, H: number, fit: MediaFit) {
  const iw = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width || 1;
  const ih = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height || 1;
  const scale = fit === 'contain' ? Math.min(W / iw, H / ih) : Math.max(W / iw, H / ih);
  const w = iw * scale;
  const h = ih * scale;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
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
  const scale = fit === 'cover' ? Math.max(box.w / mw, box.h / mh) : Math.min(box.w / mw, box.h / mh);
  const w = mw * scale;
  const h = mh * scale;
  const x = box.x + (box.w - w) / 2;
  const y = box.y + (box.h - h) / 2;
  ctx.save();
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

/** Still image: composite once (from the full-quality original), export in the original format. */
export async function exportImage(
  render: ChromeRender,
  file: File,
  radius: number,
  fit: MediaFit,
): Promise<Blob> {
  const out = newCanvas(render.width, render.height);
  const ctx = out.getContext('2d')!;
  ctx.drawImage(render.base, 0, 0);
  // createImageBitmap decodes off the main thread and is freed immediately,
  // avoiding the memory spike of an <img> holding a huge decoded photo.
  try {
    const bitmap = await createImageBitmap(file);
    render.composite(ctx, bitmap, bitmap.width, bitmap.height, radius, fit);
    bitmap.close();
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      render.composite(ctx, img, img.naturalWidth, img.naturalHeight, radius, fit);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const mime = imageMime(file);
  const blob = await toBlob(out, mime, mime === 'image/png' ? undefined : 0.92);
  out.width = out.height = 0; // release backing store
  return blob;
}

/** Animated GIF: composite the scene onto every decoded frame, re-encode as GIF. */
export async function exportGif(
  render: ChromeRender,
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

  // Cap output dimensions — a full-size GIF over many frames is huge and can
  // exhaust memory. Compose at full size, then scale the result into the encoder.
  const gifScale = Math.min(1, MAX_GIF_DIM / Math.max(render.width, render.height));
  const gw = Math.max(1, Math.round(render.width * gifScale));
  const gh = Math.max(1, Math.round(render.height * gifScale));

  const gifCanvas = newCanvas(gw, gh);
  const gifCtx = gifCanvas.getContext('2d')!;

  const encoder = new GIF({
    workers: 2,
    quality, // lower = better (1 best / 30 fast)
    dither: 'FloydSteinberg-serpentine', // smooths the gradient/screenshot banding
    width: gw,
    height: gh,
    workerScript: gifWorkerUrl,
    repeat: 0, // loop forever, like the source
  });

  // Full GIF disposal handling so optimized (partial-patch) GIFs don't ghost
  // or appear to drop frames: 2 = restore to background, 3 = restore to previous.
  let prevDisposal = 0;
  let prevDims: ParsedFrame['dims'] | null = null;
  let savedState: ImageData | null = null;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
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

    // Compose the full scene for this frame, then downscale into the encoder.
    const frameCanvas = newCanvas(render.width, render.height);
    const fctx = frameCanvas.getContext('2d')!;
    fctx.drawImage(render.base, 0, 0);
    render.composite(fctx, acc, lw, lh, radius, fit);
    gifCtx.clearRect(0, 0, gw, gh);
    gifCtx.drawImage(frameCanvas, 0, 0, gw, gh);
    frameCanvas.width = frameCanvas.height = 0;
    encoder.addFrame(gifCtx, { copy: true, delay: frame.delay || 100 });

    // Yield periodically so the main thread (and UI) stays responsive.
    if ((i & 7) === 7) await yieldToUI();
  }

  acc.width = acc.height = 0;
  patchCanvas.width = patchCanvas.height = 0;

  const blob = await new Promise<Blob>((resolve, reject) => {
    if (onProgress) encoder.on('progress', onProgress);
    encoder.on('finished', resolve);
    encoder.on('abort', () => reject(new Error('GIF encoding aborted')));
    encoder.render();
  });
  gifCanvas.width = gifCanvas.height = 0;
  return blob;
}

/** Video: draw the scene + each video frame to a canvas and record the stream as WebM. */
export async function exportVideo(
  render: ChromeRender,
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
  const out = newCanvas(render.width, render.height);
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
      ctx.drawImage(render.base, 0, 0);
      render.composite(ctx, video, vw, vh, radius, fit);
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
  const blob = await finished;
  out.width = out.height = 0; // release backing store
  video.src = '';
  return blob;
}
