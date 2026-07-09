/**
 * Lightweight magic-byte sniffing so we don't trust the client-supplied MIME
 * type on uploads. Returns the detected high-level kind, or null if the bytes
 * don't match a supported container.
 *
 * Covers the abused image types plus the common video containers. For formats
 * whose signatures are ambiguous/variable we return 'unknown' (accepted) rather
 * than risk a false rejection — the extension/MIME allow-list still applies and
 * files are re-saved with a random name + `nosniff`.
 */
export type SniffResult = 'image' | 'video' | 'unknown' | null;

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

export function sniffMedia(buf: Buffer): SniffResult {
  if (!buf || buf.length < 12) return null;

  // PNG
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image';
  // JPEG
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'image';
  // GIF87a / GIF89a
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) return 'image';
  // WEBP: "RIFF"...."WEBP"
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return 'image';

  // MP4 / ISO-BMFF: "....ftyp"
  if (startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4)) return 'video';
  // WebM / Matroska (EBML header)
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return 'video';
  // Ogg
  if (startsWith(buf, [0x4f, 0x67, 0x67, 0x53])) return 'video';

  return null;
}
