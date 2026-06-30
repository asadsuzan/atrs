import fs from 'node:fs';
import path from 'node:path';

/** Returns a matcher for fork-ignore entries (basenames, relative paths, or `*.ext`). */
function makeIgnore(ignore: string[]) {
  const exts = ignore.filter((i) => i.startsWith('*.')).map((i) => i.slice(1)); // ".zip"
  const names = new Set(ignore.filter((i) => !i.startsWith('*.')));
  return (rel: string): boolean => {
    if (!rel) return false;
    const segments = rel.split(path.sep);
    if (segments.some((s) => names.has(s))) return true;
    if (exts.some((e) => rel.endsWith(e))) return true;
    return false;
  };
}

/**
 * Copies a plugin source tree into a fresh variant working directory, skipping
 * ignored entries (node_modules, .git, build output, existing zips, …).
 */
export async function forkVariant(srcDir: string, destDir: string, ignore: string[]): Promise<void> {
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });
  const ignored = makeIgnore(ignore);
  await fs.promises.cp(srcDir, destDir, {
    recursive: true,
    filter: (source) => {
      const rel = path.relative(srcDir, source);
      if (!rel) return true;
      return !ignored(rel);
    },
  });
}
