/**
 * Strips pro-only code marked with comment tokens, for the FREE variant.
 *
 * Conventions (markers must each sit on their own line):
 *   - Whole file:  a `@pro-file` token within the first 5 lines → file removed.
 *   - Inline block: lines between `@pro:start` and `@pro:end` (inclusive of the
 *     marker lines) are removed. Pairs may nest; an unbalanced/stray marker is
 *     a hard error so a mistake fails the build instead of leaking pro code.
 *
 * The tokens work inside any line comment style (`//`, `/* *​/`, `#`, `<!-- -->`),
 * so the same convention covers JS/TS/JSX, SCSS, and PHP.
 */

const FILE_TOKEN = /@pro-file/;
const START_TOKEN = /@pro:start/;
const END_TOKEN = /@pro:end/;

export interface MarkerResult {
  content: string;
  /** Number of top-level @pro blocks removed. */
  removedBlocks: number;
  /** True when the whole file is flagged @pro-file (caller should delete it). */
  removedFile: boolean;
}

export function hasProMarkers(content: string): boolean {
  return /@pro(:start|:end|-file)/.test(content);
}

export function stripProMarkers(content: string): MarkerResult {
  const head = content.split(/\r?\n/, 5).join('\n');
  if (FILE_TOKEN.test(head)) {
    return { content: '', removedBlocks: 0, removedFile: true };
  }

  const lines = content.split(/\r?\n/);
  const out: string[] = [];
  let depth = 0;
  let removedBlocks = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (START_TOKEN.test(line)) {
      if (depth === 0) removedBlocks++;
      depth++;
      continue;
    }
    if (END_TOKEN.test(line)) {
      if (depth === 0) {
        throw new Error(`@pro:end without matching @pro:start (line ${i + 1})`);
      }
      depth--;
      continue;
    }
    if (depth === 0) out.push(line);
  }

  if (depth !== 0) {
    throw new Error(`Unbalanced @pro markers: ${depth} @pro:start block(s) never closed`);
  }

  return { content: out.join('\n'), removedBlocks, removedFile: false };
}
