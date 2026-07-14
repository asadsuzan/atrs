# `tools/dist-builder/src/config.ts`

**Purpose:** Defines the Zod schema for `dist.config.json`, the default `.distignore` list, derived types, and the loader/validator.

**Language / Size:** TS / 5418 bytes

## Exports
- `DEFAULT_DISTIGNORE: string[]`.
- `ConfigSchema` (Zod object).
- `type DistConfig = z.infer<typeof ConfigSchema>`.
- `type VariantName = 'free' | 'pro'`.
- `CONFIG_FILENAME = 'dist.config.json'`.
- `loadConfig(srcDir: string): DistConfig`.

Non-exported schemas: `VariantSchema`, `JsonPatchVariantSchema`, `JsonPatchSchema`, `TextEditOpSchema`, `TextEditSchema`.

## Imports (Internal / External)
- Internal: none.
- External: `node:fs`, `node:path`, `z` from `zod`.

## Functions
### `loadConfig(srcDir)`
- Purpose: load + validate `dist.config.json` from a plugin source dir.
- Params: `srcDir` string. Return: `DistConfig`.
- Algorithm:
  1. `file = srcDir/dist.config.json`. If not exists → throw `dist.config.json not found in <srcDir>`.
  2. Read + `JSON.parse`; on parse error throw `dist.config.json is not valid JSON: <message>`.
  3. `ConfigSchema.safeParse(raw)`; on failure throw `Invalid dist.config.json:` followed by one line per issue `  • <path>: <message>`.
  4. Return `parsed.data` (defaults applied).
- Side effects: reads file.
- Error handling: throws on missing file, invalid JSON, or schema violation.

## Config schema (every option documented)
Top-level `ConfigSchema`:

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `slug` | string (min 1) | — (required) | Plugin slug; base zip name. |
| `buildCommand` | string | `'npm run build'` | Build command run inside each variant copy. |
| `zipCommand` | string \| null | `'npm run plugin-zip'` | Packaging command; `null` skips zipping (leaves built tree). |
| `reuseNodeModules` | boolean | `true` | Symlink source `node_modules` into each variant instead of reinstalling. |
| `install` | boolean | `false` | Run `npm ci` when node_modules can't be reused. |
| `forkIgnore` | string[] | `['node_modules', '.git', 'build', 'dist', '*.zip', 'dist.config.json']` | Names skipped when copying source into a variant. |
| `siblingDeps` | string[] | `[]` | Paths outside the plugin (imported via `../…`) copied/symlinked next to variants so relative imports resolve. |
| `variants.free` | VariantSchema | `{ remove: [], zipSuffix: '' }` | Free variant. |
| `variants.pro` | VariantSchema | `{ remove: [], zipSuffix: '-pro' }` | Pro variant. |
| `stripMarkersIn` | string[] | `[]` | Globs whose files get `@pro:start/@pro:end` + `@pro-file` stripping in the FREE variant. |
| `jsonPatches` | record<string, JsonPatchSchema> | `{}` | Relative JSON file → per-variant dot-path patches. |
| `textEdits` | record<string, TextEditSchema> | `{}` | Relative text file → per-variant find/replace ops. |
| `verifyFreeHasNo` | string[] | `[]` | Tokens that must NOT appear anywhere in the built free variant. |
| `verifyIgnore` | string[] | `[]` | Globs excluded from the free verification scan. |
| `distignore` | string[] | `DEFAULT_DISTIGNORE` | Written as `.distignore` into each variant before zipping (unless plugin ships one). `[]` disables. |

`VariantSchema` (`variants.free` / `variants.pro`):
- `remove: string[]` default `[]` — paths/globs removed entirely from this variant.
- `zipSuffix: string` default `''` — appended to zip name (e.g. `-pro`).

`JsonPatchSchema` (per JSON file): `{ free?: JsonPatchVariantSchema.partial(), pro?: JsonPatchVariantSchema.partial() }`.
`JsonPatchVariantSchema`: `{ remove: string[] default [], set: record<string, unknown> default {} }`.

`TextEditSchema` (per text file, `.partial()`): `{ free?: TextEditOp[] default [], pro?: TextEditOp[] default [] }`.
`TextEditOpSchema`: `{ drop?: string, replace?: string, with?: string, flags?: string }`.

### `DEFAULT_DISTIGNORE`
Gitignore-style list written before `wp-scripts plugin-zip`; keeps compiled `build/`, PHP, vendor, readme, languages, block assets; excludes dev/source/tooling. Entries:
`.git`, `.github`, `.gitignore`, `.distignore`, `.editorconfig`, `.vscode`, `node_modules`, `src`, `tools`, `tests`, `bin`, `dist`, `dist.config.json`, `*.zip`, `package-lock.json`, `composer.lock`, `gulpfile.js`, `webpack.config.js`, `*.config.js`, `tsconfig.json`, `tsconfig.*.json`, `.eslintrc`, `.eslintrc.js`, `.eslintrc.json`, `.eslintignore`, `.prettierrc`, `.prettierrc.js`, `.babelrc`, `phpcs.xml`, `phpcs.xml.dist`, `phpunit.xml`, `phpunit.xml.dist`, `.wordpress-org`.

## Relationships & pipeline order
`loadConfig` is the first step of `runDistribution` (index.ts). Its returned `DistConfig` drives fork, removals, marker stripping, JSON/text transforms, verify, and build.
