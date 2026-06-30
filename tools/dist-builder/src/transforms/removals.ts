import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

const GLOB_CHARS = /[*?{}[\]()!+@]/;

/**
 * Removes files/directories matching the given paths or globs from `dir`.
 * Plain paths (no glob chars) are removed directly so whole directories like
 * `vendor/freemius` are dropped cleanly; glob patterns are expanded first.
 * Returns the relative paths actually removed.
 */
export async function applyRemovals(dir: string, patterns: string[]): Promise<string[]> {
  const removed: string[] = [];
  for (const pattern of patterns) {
    if (!GLOB_CHARS.test(pattern)) {
      const abs = path.join(dir, pattern);
      if (fs.existsSync(abs)) {
        fs.rmSync(abs, { recursive: true, force: true });
        removed.push(pattern);
      }
      continue;
    }
    const matches = await fg(pattern, { cwd: dir, dot: true, onlyFiles: false, markDirectories: false });
    // Deepest paths first so children are gone before their parents.
    for (const rel of matches.sort((a, b) => b.length - a.length)) {
      const abs = path.join(dir, rel);
      if (fs.existsSync(abs)) {
        fs.rmSync(abs, { recursive: true, force: true });
        removed.push(rel);
      }
    }
  }
  return removed;
}
