# `tools/dist-builder/examples/offcanvas-block/dist.config.json`

**Purpose:** Example `dist.config.json` for the `offcanvas-block` plugin, demonstrating every commonly-used config section. Copied into a plugin root to drive the builder.

**Language / Size:** JSON / 1127 bytes

## Config values (as set in this example)
| Key | Value |
| --- | --- |
| `slug` | `"offcanvas-block"` |
| `buildCommand` | `"npm run build"` |
| `zipCommand` | `"npm run plugin-zip"` |
| `reuseNodeModules` | `true` |
| `install` | `true` |
| `forkIgnore` | `["node_modules", ".git", "build", "*.zip"]` |
| `siblingDeps` | `["../bpl-tools"]` |
| `variants.free.remove` | `["vendor/freemius", "includes/LicenseActivation.php"]` |
| `variants.pro.remove` | `["vendor/freemius-lite"]` |
| `variants.pro.zipSuffix` | `"-pro"` |
| `stripMarkersIn` | `["src/**/*.{js,jsx,ts,tsx,scss}", "*.php", "includes/**/*.php"]` |
| `jsonPatches` | `block.json` → free removes 3 dot-paths (below) |
| `textEdits` | `index.php` → free drops `@fs_premium_only` and `@fs_free_only` lines |
| `verifyIgnore` | `["vendor/**"]` |
| `verifyFreeHasNo` | `["LicenseActivation", "@pro:start", "@pro:end", "is__premium_only"]` |

### `jsonPatches` detail
`block.json` → `free.remove`:
- `attributes.offCanvasSettings.default.options.smartTrigger`
- `attributes.offCanvasSettings.default.options.isFAB`
- `attributes.offCanvasStyles.default.fab`

## Notes (traceable to schema defaults)
- No `zipSuffix` set for `free`, so it defaults to `""` → zip name `offcanvas-block.zip`; pro → `offcanvas-block-pro.zip`.
- `distignore` not set here, so the builder uses `DEFAULT_DISTIGNORE`.
- `forkIgnore` here omits the default `dist` and `dist.config.json` entries; the engine always appends `CONFIG_FILENAME` to the fork-ignore list regardless.

## Relationships & pipeline order
Consumed by `loadConfig` (config.ts) and validated against `ConfigSchema`, then drives `runDistribution` (index.ts) exactly as described in that file's doc.
