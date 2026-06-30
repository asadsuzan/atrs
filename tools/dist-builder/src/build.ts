import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { DistConfig } from './config';

/** Runs a shell command in `cwd`, streaming output; rejects on non-zero exit. */
export function run(command: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { cwd, shell: true, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`\`${command}\` exited with code ${code}`));
    });
  });
}

/** Symlinks the source's node_modules into a variant so we don't reinstall. */
function linkNodeModules(srcDir: string, destDir: string): boolean {
  const from = path.join(srcDir, 'node_modules');
  const to = path.join(destDir, 'node_modules');
  if (!fs.existsSync(from) || fs.existsSync(to)) return false;
  try {
    fs.symlinkSync(from, to, process.platform === 'win32' ? 'junction' : 'dir');
    return true;
  } catch {
    return false;
  }
}

/** Newest *.zip at the top level of `dir`, or null. */
export function findNewestZip(dir: string): string | null {
  const zips = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.zip'))
    .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  return zips.length ? path.join(dir, zips[0].f) : null;
}

export interface BuildOutcome {
  builtNodeModules: 'linked' | 'installed' | 'preexisting';
  zipPath: string | null;
}

/** Prepares deps, runs the plugin's own build + packaging commands in `workDir`. */
export async function buildVariant(workDir: string, srcDir: string, config: DistConfig): Promise<BuildOutcome> {
  let builtNodeModules: BuildOutcome['builtNodeModules'] = 'preexisting';
  if (!fs.existsSync(path.join(workDir, 'node_modules'))) {
    if (config.reuseNodeModules && linkNodeModules(srcDir, workDir)) {
      builtNodeModules = 'linked';
    } else if (config.install) {
      await run('npm ci', workDir);
      builtNodeModules = 'installed';
    } else {
      throw new Error('No node_modules available (reuseNodeModules failed and install is false)');
    }
  }

  await run(config.buildCommand, workDir);

  let zipPath: string | null = null;
  if (config.zipCommand) {
    // Ensure a .distignore so plugin-zip keeps the compiled build/ (which is
    // usually .gitignored) and drops dev/source files. Respect a plugin's own.
    if (config.distignore.length) {
      const distignorePath = path.join(workDir, '.distignore');
      if (!fs.existsSync(distignorePath)) {
        fs.writeFileSync(distignorePath, `${config.distignore.join('\n')}\n`);
      }
    }
    await run(config.zipCommand, workDir);
    zipPath = findNewestZip(workDir);
  }
  return { builtNodeModules, zipPath };
}
