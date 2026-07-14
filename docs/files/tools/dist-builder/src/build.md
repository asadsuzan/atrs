# `tools/dist-builder/src/build.ts`

**Purpose:** Prepares dependencies for a variant working copy and runs the plugin's own build + packaging commands, then locates the produced zip.

**Language / Size:** TS / 2841 bytes

## Exports
- `run(command: string, cwd: string): Promise<void>` — runs a shell command streaming stdio.
- `findNewestZip(dir: string): string | null` — newest top-level `*.zip` in `dir`.
- `interface BuildOutcome` — `{ builtNodeModules: 'linked' | 'installed' | 'preexisting'; zipPath: string | null }`.
- `buildVariant(workDir, srcDir, config): Promise<BuildOutcome>`.

Non-exported: `linkNodeModules(srcDir, destDir): boolean`.

## Imports (Internal / External)
- Internal: `type { DistConfig } from './config'`.
- External: `node:fs`, `node:path`, `spawn` from `node:child_process`.

## Functions
### `run(command, cwd)`
- Purpose: run a shell command in `cwd`, streaming output; reject on non-zero exit.
- Params: `command` string, `cwd` string. Return: `Promise<void>`.
- Algorithm: `spawn(command, { cwd, shell: true, stdio: 'inherit' })`; on `'error'` reject; on `'exit'` resolve if code === 0, else reject with `` `${command}` exited with code ${code} ``.
- Side effects: spawns a child process; inherits stdio.
- Error handling: rejects on spawn error or non-zero exit code.

### `linkNodeModules(srcDir, destDir)` (private)
- Purpose: symlink source's `node_modules` into the variant to avoid reinstall.
- Return: `boolean` (true if a symlink was created).
- Algorithm: `from = srcDir/node_modules`, `to = destDir/node_modules`. If `from` does not exist OR `to` already exists → return false. Try `fs.symlinkSync(from, to, 'junction' on win32 else 'dir')` → return true; on throw return false.
- Side effects: creates a filesystem symlink/junction.
- Error handling: catches any error and returns false.

### `findNewestZip(dir)`
- Purpose: find newest `*.zip` at the top level of `dir`.
- Return: absolute path string or `null`.
- Algorithm: `readdirSync(dir)`, filter names ending `.zip` (case-insensitive), map to `{ f, m: statSync(...).mtimeMs }`, sort descending by mtime, return `path.join(dir, zips[0].f)` or null if none.
- Side effects: reads directory + file stats.

### `buildVariant(workDir, srcDir, config)`
- Purpose: prepare deps, run build + packaging in `workDir`.
- Return: `Promise<BuildOutcome>`.
- Algorithm:
  1. `builtNodeModules = 'preexisting'`.
  2. If `workDir/node_modules` does not exist: if `config.reuseNodeModules` and `linkNodeModules` succeeds → `'linked'`; else if `config.install` → `await run('npm ci', workDir)` → `'installed'`; else throw `'No node_modules available (reuseNodeModules failed and install is false)'`.
  3. `await run(config.buildCommand, workDir)`.
  4. If `config.zipCommand`: if `config.distignore.length` and `workDir/.distignore` does not already exist → write `.distignore` from `config.distignore.join('\n')` + trailing newline (respects a plugin's own existing file). Then `await run(config.zipCommand, workDir)` and `zipPath = findNewestZip(workDir)`.
  5. Return `{ builtNodeModules, zipPath }`.
- Side effects: symlinks/installs node_modules, writes `.distignore`, runs build/zip shell commands.
- Error handling: throws when no node_modules can be provided; `run` rejections propagate.

## Relationships & pipeline order
Called by `index.ts` `processVariant` when not a dry run, after all transforms + verify. Consumed values: `outcome.zipPath` copied to `outDir/<slug><zipSuffix>.zip`.
