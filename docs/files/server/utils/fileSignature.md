# `server/src/utils/fileSignature.ts`
**Purpose:** Lightweight magic-byte ("magic number") sniffing of uploaded files so the server does not trust the client-supplied MIME type. Returns the detected high-level media kind or null.
**Language / Size:** TypeScript / 1601 bytes

## Exports
- `type SniffResult = 'image' | 'video' | 'unknown' | null`
- `function sniffMedia(buf: Buffer): SniffResult`

## Imports (Internal / External)
- None (no imports; operates on a `Buffer` passed in).

## Functions / Methods
### `startsWith(buf, bytes, offset = 0): boolean` (private)
Returns true if `buf` contains the exact byte sequence `bytes` starting at `offset`. Returns false early if the buffer is too short to hold `offset + bytes.length`.

### `sniffMedia(buf: Buffer): SniffResult`
Inspects leading bytes to classify the container:
- Returns `null` if `buf` is falsy or shorter than 12 bytes.
- `'image'` for PNG (`89 50 4E 47 0D 0A 1A 0A`), JPEG (`FF D8 FF`), GIF (`47 49 46 38` = "GIF8"), or WEBP (`RIFF` at offset 0 and `WEBP` at offset 8).
- `'video'` for MP4 / ISO-BMFF (`ftyp` at offset 4), WebM / Matroska EBML header (`1A 45 DF A3`), or Ogg (`OggS` = `4F 67 67 53`).
- Returns `null` when no signature matches.

Note: despite the `SniffResult` type including `'unknown'`, the function itself never returns `'unknown'` — that value exists in the type for callers who choose to accept ambiguous/variable formats. The file header comment explains such formats are treated as accepted rather than risk a false rejection, relying on the extension/MIME allow-list plus random-name re-save + `nosniff` as additional defenses.

## Data structures / Types / Constants
- `SniffResult` union type (see Exports).

## Important algorithms
Fixed-offset byte comparison against a small table of known container signatures. No allocation beyond the input buffer; O(number of signatures) checks, each O(signature length).

## Relationships
Used by upload-handling code to validate uploaded media beyond the declared MIME type. Complements the extension/MIME allow-list and the random-filename + `nosniff` re-save strategy described in the header comment.

## Edge cases & known limitations
- Requires at least 12 bytes; smaller buffers always return `null`.
- WEBP detection requires both the `RIFF` prefix and `WEBP` at offset 8 (a bare RIFF, e.g. WAV/AVI, is not classified as image).
- MP4 detection keys only on `ftyp` at offset 4 and does not inspect the specific brand.
- The function never returns `'unknown'`; ambiguous formats fall through to `null`.
