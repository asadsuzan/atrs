import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

/** A single distributable variant (free or pro). */
const VariantSchema = z.object({
  /** Paths/globs removed entirely from this variant (dirs or files). */
  remove: z.array(z.string()).default([]),
  /** Appended to the zip name, e.g. "-pro" → offcanvas-block-pro.zip. */
  zipSuffix: z.string().default(''),
});

/** Per-variant JSON edits, applied by dot-path (JSON can't hold comment markers). */
const JsonPatchVariantSchema = z.object({
  remove: z.array(z.string()).default([]),
  set: z.record(z.string(), z.unknown()).default({}),
});
const JsonPatchSchema = z.object({
  free: JsonPatchVariantSchema.partial().optional(),
  pro: JsonPatchVariantSchema.partial().optional(),
});

/** A find/replace or line-drop edit for a text file (e.g. plugin header). */
const TextEditOpSchema = z.object({
  /** Drop every line containing this substring. */
  drop: z.string().optional(),
  /** Regex source to replace (paired with `with`). */
  replace: z.string().optional(),
  with: z.string().optional(),
  flags: z.string().optional(),
});
const TextEditSchema = z.object({
  free: z.array(TextEditOpSchema).default([]),
  pro: z.array(TextEditOpSchema).default([]),
}).partial();

/**
 * Default `.distignore` (gitignore-style) written into each variant before
 * `wp-scripts plugin-zip`. Excludes dev/source/tooling but keeps the compiled
 * `build/`, PHP, vendor, readme, languages, and block assets.
 */
export const DEFAULT_DISTIGNORE: string[] = [
  '.git',
  '.github',
  '.gitignore',
  '.distignore',
  '.editorconfig',
  '.vscode',
  'node_modules',
  'src',
  'tools',
  'tests',
  'bin',
  'dist',
  'dist.config.json',
  '*.zip',
  'package-lock.json',
  'composer.lock',
  'gulpfile.js',
  'webpack.config.js',
  '*.config.js',
  'tsconfig.json',
  'tsconfig.*.json',
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.json',
  '.eslintignore',
  '.prettierrc',
  '.prettierrc.js',
  '.babelrc',
  'phpcs.xml',
  'phpcs.xml.dist',
  'phpunit.xml',
  'phpunit.xml.dist',
  '.wordpress-org',
];

export const ConfigSchema = z.object({
  /** Plugin slug; used as the base zip name. */
  slug: z.string().min(1),
  /** Build command run inside each variant copy. */
  buildCommand: z.string().default('npm run build'),
  /** Packaging command; set null to skip zipping (engine then leaves the built tree). */
  zipCommand: z.string().nullable().default('npm run plugin-zip'),
  /** Symlink the source's node_modules into each variant instead of re-installing. */
  reuseNodeModules: z.boolean().default(true),
  /** Run `npm ci` in a variant when node_modules couldn't be reused. */
  install: z.boolean().default(false),
  /** Names skipped when copying the source into a variant working dir. */
  forkIgnore: z.array(z.string()).default(['node_modules', '.git', 'build', 'dist', '*.zip', 'dist.config.json']),
  /**
   * Paths (relative to the plugin root) that live OUTSIDE it but are needed at
   * build time — e.g. a shared "../bpl-tools" folder imported via `../../../`.
   * Each is copied next to the variant so those relative imports still resolve.
   * Its source is not shipped; the build compiles it into `build/`.
   */
  siblingDeps: z.array(z.string()).default([]),
  variants: z.object({
    free: VariantSchema.default({ remove: [], zipSuffix: '' }),
    pro: VariantSchema.default({ remove: [], zipSuffix: '-pro' }),
  }).default({ free: { remove: [], zipSuffix: '' }, pro: { remove: [], zipSuffix: '-pro' } }),
  /** Globs whose files get @pro:start/@pro:end and @pro-file stripping in the FREE variant. */
  stripMarkersIn: z.array(z.string()).default([]),
  /** Map of relative JSON file → per-variant dot-path patches. */
  jsonPatches: z.record(z.string(), JsonPatchSchema).default({}),
  /** Map of relative text file → per-variant find/replace ops. */
  textEdits: z.record(z.string(), TextEditSchema).default({}),
  /** Tokens that must NOT appear anywhere in the built free variant. */
  verifyFreeHasNo: z.array(z.string()).default([]),
  /** Globs excluded from the free verification scan (e.g. third-party vendor SDKs). */
  verifyIgnore: z.array(z.string()).default([]),
  /**
   * Written as `.distignore` into each variant before zipping (unless the plugin
   * already ships one), so `wp-scripts plugin-zip` keeps the compiled `build/`
   * and drops dev/source files — `.distignore` overrides `.gitignore` for it.
   * Set to [] to disable.
   */
  distignore: z.array(z.string()).default(DEFAULT_DISTIGNORE),
});

export type DistConfig = z.infer<typeof ConfigSchema>;
export type VariantName = 'free' | 'pro';

export const CONFIG_FILENAME = 'dist.config.json';

/** Loads and validates dist.config.json from a plugin source directory. */
export function loadConfig(srcDir: string): DistConfig {
  const file = path.join(srcDir, CONFIG_FILENAME);
  if (!fs.existsSync(file)) {
    throw new Error(`${CONFIG_FILENAME} not found in ${srcDir}`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${CONFIG_FILENAME} is not valid JSON: ${(err as Error).message}`);
  }
  const parsed = ConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid ${CONFIG_FILENAME}:\n${parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }
  return parsed.data;
}
