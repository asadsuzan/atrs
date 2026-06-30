import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import fg from 'fast-glob';
import { loadConfig, CONFIG_FILENAME, type DistConfig, type VariantName } from './config';
import { forkVariant } from './fork';
import { applyRemovals } from './transforms/removals';
import { stripProMarkers, hasProMarkers } from './transforms/markers';
import { applyJsonPatch } from './transforms/jsonPatches';
import { applyTextEdits } from './transforms/textEdits';
import { buildVariant } from './build';
import { verifyFree, type VerifyHit } from './verify';

export { loadConfig } from './config';
export type { DistConfig, VariantName } from './config';

export interface VariantReport {
  variant: VariantName;
  workDir: string;
  removedPaths: string[];
  strippedFiles: { file: string; removedBlocks: number; removedFile: boolean }[];
  jsonPatched: { file: string; removed: string[]; set: string[] }[];
  textEdited: string[];
  verifyHits: VerifyHit[];
  zipPath: string | null;
  built: boolean;
}

export interface RunOptions {
  /** Where finished zips land (default: <src>/dist). */
  outDir?: string;
  /** Restrict to specific variants (default: both). */
  only?: VariantName[];
  /** Skip build/zip; just produce + verify the stripped source trees. */
  dryRun?: boolean;
  /** Root for variant working copies (default: an OS temp dir). */
  workRoot?: string;
  /** Progress logger (default: console.log). */
  log?: (msg: string) => void;
}

export interface RunResult {
  slug: string;
  outDir: string;
  variants: VariantReport[];
}

async function transformFreeMarkers(workDir: string, config: DistConfig) {
  const stripped: VariantReport['strippedFiles'] = [];
  if (!config.stripMarkersIn.length) return stripped;
  const files = await fg(config.stripMarkersIn, { cwd: workDir, dot: true });
  for (const rel of files) {
    const abs = path.join(workDir, rel);
    const content = fs.readFileSync(abs, 'utf8');
    if (!hasProMarkers(content)) continue;
    let result;
    try {
      result = stripProMarkers(content);
    } catch (err) {
      throw new Error(`${rel}: ${(err as Error).message}`);
    }
    if (result.removedFile) {
      fs.rmSync(abs);
      stripped.push({ file: rel, removedBlocks: 0, removedFile: true });
    } else if (result.removedBlocks > 0) {
      fs.writeFileSync(abs, result.content);
      stripped.push({ file: rel, removedBlocks: result.removedBlocks, removedFile: false });
    }
  }
  return stripped;
}

function transformJson(workDir: string, config: DistConfig, variant: VariantName) {
  const patched: VariantReport['jsonPatched'] = [];
  for (const [rel, perVariant] of Object.entries(config.jsonPatches)) {
    const ops = perVariant[variant];
    if (!ops) continue;
    const abs = path.join(workDir, rel);
    if (!fs.existsSync(abs)) continue;
    const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const res = applyJsonPatch(json, ops);
    fs.writeFileSync(abs, `${JSON.stringify(json, null, 2)}\n`);
    patched.push({ file: rel, removed: res.removed, set: res.set });
  }
  return patched;
}

function transformText(workDir: string, config: DistConfig, variant: VariantName) {
  const edited: string[] = [];
  for (const [rel, perVariant] of Object.entries(config.textEdits)) {
    const ops = perVariant[variant] ?? [];
    if (!ops.length) continue;
    const abs = path.join(workDir, rel);
    if (!fs.existsSync(abs)) continue;
    const before = fs.readFileSync(abs, 'utf8');
    const after = applyTextEdits(before, ops);
    if (after !== before) {
      fs.writeFileSync(abs, after);
      edited.push(rel);
    }
  }
  return edited;
}

async function processVariant(
  srcDir: string,
  config: DistConfig,
  variant: VariantName,
  workRoot: string,
  outDir: string,
  opts: RunOptions,
): Promise<VariantReport> {
  const log = opts.log ?? ((m: string) => console.log(m));
  const workDir = path.join(workRoot, `${config.slug}-${variant}`);

  log(`[${variant}] forking source → ${workDir}`);
  // The config file itself must never be shipped or scanned, regardless of a
  // user-supplied forkIgnore.
  await forkVariant(srcDir, workDir, [...config.forkIgnore, CONFIG_FILENAME]);

  log(`[${variant}] removing ${config.variants[variant].remove.length} path(s)`);
  const removedPaths = await applyRemovals(workDir, config.variants[variant].remove);

  // Pro code is only stripped from the free variant; pro keeps everything.
  const strippedFiles = variant === 'free' ? await transformFreeMarkers(workDir, config) : [];
  const jsonPatched = transformJson(workDir, config, variant);
  const textEdited = transformText(workDir, config, variant);

  let verifyHits: VerifyHit[] = [];
  if (variant === 'free' && config.verifyFreeHasNo.length) {
    log(`[${variant}] verifying no pro tokens remain`);
    verifyHits = await verifyFree(workDir, config.verifyFreeHasNo, config.verifyIgnore);
    if (verifyHits.length) {
      const summary = verifyHits.slice(0, 10).map((h) => `  • "${h.token}" in ${h.file}:${h.line}`).join('\n');
      throw new Error(
        `[free] verification failed — pro tokens still present (${verifyHits.length} hit(s)):\n${summary}` +
          (verifyHits.length > 10 ? `\n  …and ${verifyHits.length - 10} more` : ''),
      );
    }
  }

  let zipPath: string | null = null;
  let built = false;
  if (!opts.dryRun) {
    log(`[${variant}] building + packaging`);
    const outcome = await buildVariant(workDir, srcDir, config);
    built = true;
    if (outcome.zipPath) {
      fs.mkdirSync(outDir, { recursive: true });
      const dest = path.join(outDir, `${config.slug}${config.variants[variant].zipSuffix}.zip`);
      fs.copyFileSync(outcome.zipPath, dest);
      zipPath = dest;
      log(`[${variant}] → ${dest}`);
    } else {
      log(`[${variant}] built (no zip command configured)`);
    }
  }

  return { variant, workDir, removedPaths, strippedFiles, jsonPatched, textEdited, verifyHits, zipPath, built };
}

/** Splits a mixed free/pro plugin source tree into distributable variants. */
export async function runDistribution(srcDir: string, opts: RunOptions = {}): Promise<RunResult> {
  const resolvedSrc = path.resolve(srcDir);
  const config = loadConfig(resolvedSrc);
  const variants = opts.only ?? (['free', 'pro'] as VariantName[]);
  const outDir = path.resolve(opts.outDir ?? path.join(resolvedSrc, 'dist'));
  const workRoot = opts.workRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), 'dist-builder-'));

  const log = opts.log ?? ((m: string) => console.log(m));

  // Make build-time dependencies that live outside the plugin (imported via
  // `../…`) resolvable next to the variants. Symlink so the dep keeps its own
  // node_modules and resolves exactly as in a normal in-place build; fall back
  // to a full copy (node_modules included) if symlinks aren't permitted.
  for (const dep of config.siblingDeps) {
    const from = path.resolve(resolvedSrc, dep);
    const to = path.join(workRoot, path.basename(dep));
    if (!fs.existsSync(from)) {
      log(`! siblingDep not found, skipping: ${from}`);
      continue;
    }
    if (fs.existsSync(to)) continue;
    try {
      fs.symlinkSync(from, to, process.platform === 'win32' ? 'junction' : 'dir');
      log(`linked siblingDep ${dep} → ${to}`);
    } catch {
      log(`copying siblingDep ${dep} → ${to} (symlink unavailable)`);
      await fs.promises.cp(from, to, { recursive: true });
    }
  }

  const reports: VariantReport[] = [];
  for (const variant of variants) {
    reports.push(await processVariant(resolvedSrc, config, variant, workRoot, outDir, opts));
  }
  return { slug: config.slug, outDir, variants: reports };
}
