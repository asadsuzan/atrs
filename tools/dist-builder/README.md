# @atrs/dist-builder

Splits a **single mixed free/pro WordPress plugin source tree** into two
distributable zips:

- **`<slug>.zip`** — the wp.org-safe free build, with all pro-marked code
  physically removed (no license gating, no premium code shipped).
- **`<slug>-pro.zip`** — the full build.

It strips pro-marked source, then runs the plugin's **own** build + packaging
commands per variant, so the output is exactly what you'd ship.

This is the reusable engine + CLI. An ATRS web UI is layered on top of the same
`runDistribution()` API later.

---

## How it decides what is "pro"

A hybrid of a **manifest** (`dist.config.json`) and **in-code comment markers**.

### 1. Whole files / folders — manifest
```jsonc
"variants": {
  "free": { "remove": ["vendor/freemius", "includes/LicenseActivation.php"] },
  "pro":  { "remove": ["vendor/freemius-lite"], "zipSuffix": "-pro" }
}
```

### 2. Inline pro code — comment markers (free build only)
Wrap pro-only code in markers **on their own lines**. They work in any comment
style, so the same tokens cover JS/TS/JSX, SCSS, and PHP:

```js
const free = true;
/* @pro:start */
import { LicenseGate } from './pro/LicenseGate';
renderProControls();
/* @pro:end */
```

```php
// @pro:start
require_once __DIR__ . '/pro/advanced-triggers.php';
// @pro:end
```

A file that is entirely pro can be flagged near the top instead of listing it in
the manifest:
```js
// @pro-file
export const licenseActivation = /* … */;
```

Unbalanced markers are a **hard error** — a mistake fails the build rather than
leaking pro code into free.

### 3. Pro defaults in JSON — dot-path patches
JSON can't carry comments, so `block.json` pro attribute defaults are removed by
path:
```jsonc
"jsonPatches": {
  "block.json": {
    "free": { "remove": ["attributes.offCanvasStyles.default.fab"] }
  }
}
```

### 4. Header / Freemius tweaks — text edits
```jsonc
"textEdits": {
  "index.php": { "free": [{ "drop": "@fs_premium_only" }, { "drop": "@fs_free_only" }] }
}
```
`drop` removes any line containing the token; `replace`/`with`/`flags` do a regex
replace.

### 5. Safety net — verification
After stripping, the free tree is scanned and the build **fails** if any of these
appear:
```jsonc
"verifyFreeHasNo": ["LicenseActivation", "vendor/freemius/start.php", "@pro:start", "is__premium_only"]
```

---

## Usage

```bash
cd tools/dist-builder
npm install
npm run build          # compile the CLI

# Point at a plugin that has a dist.config.json at its root:
node dist/cli.js --src /path/to/offcanvas-block
# or during development, without compiling:
npm run dev -- --src /path/to/offcanvas-block
```

Options:

| Flag | Meaning |
| --- | --- |
| `--src <dir>` | Plugin source dir (has `dist.config.json`). Default: cwd |
| `--out <dir>` | Where zips are written. Default: `<src>/dist` |
| `--only free,pro` | Build only some variants |
| `--dry-run` | Strip + verify only; skip the build/zip (fast feedback) |
| `--work <dir>` | Root for variant working copies. Default: OS temp |

Get started by copying [`examples/offcanvas-block/dist.config.json`](examples/offcanvas-block/dist.config.json)
into the plugin root and adding `@pro:start` / `@pro:end` markers around the
pro code in `src/`.

## Pipeline

```
fork source → remove pro paths → strip @pro markers (free)
            → patch JSON → edit header text → verify (free)
            → npm run build → npm run plugin-zip → emit <slug>[-pro].zip
```

`node_modules` is symlinked from the source into each variant (`reuseNodeModules`)
so builds don't reinstall; set `install: true` to fall back to `npm ci`.

## Tests

```bash
npm test     # vitest — covers the pure transforms (markers, json, text)
```
