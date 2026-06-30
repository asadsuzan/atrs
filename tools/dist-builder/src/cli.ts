#!/usr/bin/env node
import { parseArgs } from 'node:util';
import path from 'node:path';
import { runDistribution, type VariantName } from './index';

const HELP = `dist-builder — split a free/pro WordPress plugin into distributable zips

Usage:
  dist-builder --src <plugin-dir> [options]

Options:
  --src <dir>        Plugin source directory (contains dist.config.json). Default: cwd
  --out <dir>        Output directory for zips. Default: <src>/dist
  --only <list>      Comma-separated variants to build: free,pro. Default: both
  --dry-run          Strip + verify only; skip build/zip
  --work <dir>       Working directory root for variant copies. Default: OS temp
  -h, --help         Show this help
`;

async function main() {
  const { values } = parseArgs({
    options: {
      src: { type: 'string' },
      out: { type: 'string' },
      only: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      work: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  if (values.help) {
    process.stdout.write(HELP);
    return;
  }

  const src = path.resolve(values.src ?? process.cwd());
  const only = values.only
    ? (values.only.split(',').map((s) => s.trim()) as VariantName[])
    : undefined;

  if (only && only.some((v) => v !== 'free' && v !== 'pro')) {
    throw new Error(`--only accepts "free" and/or "pro" (got "${values.only}")`);
  }

  const result = await runDistribution(src, {
    outDir: values.out,
    only,
    dryRun: values['dry-run'],
    workRoot: values.work,
  });

  process.stdout.write(`\nDistribution Builder — ${result.slug}\n`);
  for (const v of result.variants) {
    const removed = v.removedPaths.length;
    const blocks = v.strippedFiles.reduce((n, f) => n + f.removedBlocks, 0);
    const droppedFiles = v.strippedFiles.filter((f) => f.removedFile).length;
    process.stdout.write(
      `  ${v.variant.toUpperCase().padEnd(4)}  ` +
        `removed ${removed} path(s), ${blocks} pro block(s), ${droppedFiles} pro file(s); ` +
        `json: ${v.jsonPatched.length}, text: ${v.textEdited.length}\n`,
    );
    if (v.zipPath) process.stdout.write(`        zip: ${v.zipPath}\n`);
    else if (!v.built) process.stdout.write('        (dry run — not built)\n');
  }
  process.stdout.write('\nDone.\n');
}

main().catch((err: Error) => {
  process.stderr.write(`\n✖ ${err.message}\n`);
  process.exit(1);
});
