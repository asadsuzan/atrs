/**
 * Extracts a representative accent color from an image (product logo/banner)
 * for the presentation deck's "dynamic accent" mode.
 *
 * Runs entirely client-side on a downscaled canvas. Cross-origin images must be
 * served with permissive CORS (ATRS serves /uploads that way); a tainted canvas
 * or a load error resolves to `null` so callers can fall back gracefully.
 */

const cache = new Map<string, string | null>();

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Relative luminance (0–1). */
function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Saturation of an RGB color (0–1), HSV-style. */
function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/** Nudges a color toward a usable mid-range so it reads on both light/dark decks. */
function normalize(r: number, g: number, b: number): [number, number, number] {
  const lum = luminance(r, g, b);
  if (lum > 0.75) { const k = 0.72; return [r * k, g * k, b * k]; } // too light → darken
  if (lum < 0.12) { const k = 1.6; return [Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k)]; } // too dark → lighten
  return [r, g, b];
}

export function extractAccentColor(url?: string): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  if (cache.has(url)) return Promise.resolve(cache.get(url)!);

  const result = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    img.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // Bucket saturated pixels into a coarse RGB grid, weight by saturation,
        // and keep a running average of all opaque pixels as a fallback.
        const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
        let avgR = 0, avgG = 0, avgB = 0, avgN = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;
          avgR += r; avgG += g; avgB += b; avgN++;

          const lum = luminance(r, g, b);
          const sat = saturation(r, g, b);
          if (lum > 0.93 || lum < 0.07 || sat < 0.18) continue; // skip white/black/gray

          const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
          const weight = sat;
          const cur = buckets.get(key);
          if (cur) { cur.w += weight; cur.r += r * weight; cur.g += g * weight; cur.b += b * weight; }
          else buckets.set(key, { w: weight, r: r * weight, g: g * weight, b: b * weight });
        }

        if (avgN === 0) return resolve(null);

        let best: { w: number; r: number; g: number; b: number } | null = null;
        for (const bkt of buckets.values()) if (!best || bkt.w > best.w) best = bkt;

        let r: number, g: number, b: number;
        if (best) {
          r = best.r / best.w; g = best.g / best.w; b = best.b / best.w;
        } else {
          // No vivid color (monochrome art) → fall back to the overall average.
          r = avgR / avgN; g = avgG / avgN; b = avgB / avgN;
        }

        const [nr, ng, nb] = normalize(r, g, b);
        resolve(rgbToHex(nr, ng, nb));
      } catch {
        resolve(null); // tainted canvas / read blocked
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  }).then((hex) => {
    cache.set(url, hex);
    return hex;
  });

  return result;
}
