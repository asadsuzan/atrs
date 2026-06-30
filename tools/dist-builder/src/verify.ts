import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

/** Text file types worth scanning for leaked pro tokens (skips binaries). */
const TEXT_GLOBS = ['**/*.{php,js,jsx,ts,tsx,mjs,cjs,json,css,scss,sass,html,htm,txt,md}'];

export interface VerifyHit {
  token: string;
  file: string;
  line: number;
}

/**
 * Scans a built variant for tokens that must not survive into the free build
 * (license code, full Freemius paths, leftover @pro markers, …). Returns every
 * occurrence so the caller can fail loudly.
 */
export async function verifyFree(dir: string, forbidden: string[], ignore: string[] = []): Promise<VerifyHit[]> {
  if (!forbidden.length) return [];
  const files = await fg(TEXT_GLOBS, {
    cwd: dir,
    dot: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/*.map', ...ignore],
  });
  const hits: VerifyHit[] = [];
  for (const rel of files) {
    let content: string;
    try {
      content = fs.readFileSync(path.join(dir, rel), 'utf8');
    } catch {
      continue;
    }
    if (!forbidden.some((t) => content.includes(t))) continue;
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      for (const token of forbidden) {
        if (line.includes(token)) hits.push({ token, file: rel, line: idx + 1 });
      }
    });
  }
  return hits;
}
