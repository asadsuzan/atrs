# `server/src/utils/repoAccess.ts`
**Purpose:** Filesystem jail for the server-side folder picker and changelog generator — confines all path access to a configurable repository root so authenticated users can't walk the host filesystem.
**Language / Size:** TypeScript / 1957 bytes

## Exports
- `function getRepoRoot(): string`
- `function isWithinRepoRoot(target: string): boolean`
- `function resolveWithinRepoRoot(raw: string): string`
- `function assertRepoPathAllowed(repoPath: string): void`

## Imports (Internal / External)
- Internal: `createHttpError` (default) from `./httpError`.
- External: `path`, `os` (node builtins).

## Functions / Methods
### `getRepoRoot()`
Returns `path.resolve(REPO_BROWSE_ROOT || os.homedir())` — the allowed root, defaulting to the OS home directory, overridable via the `REPO_BROWSE_ROOT` env var.

### `isWithinRepoRoot(target)`
Resolves `target` and returns true if it equals the root or lives beneath it. Computes `path.relative(root, resolved)`; considered outside iff the relative path is empty, starts with `..`, or is absolute (e.g. a different Windows drive).

### `resolveWithinRepoRoot(raw)`
Resolves `raw` (empty input → the root itself). Throws `createHttpError(403, 'Path is outside the allowed repository root.')` if not within the root; otherwise returns the resolved absolute path.

### `assertRepoPathAllowed(repoPath)`
Guard used before running git against a stored product `repoPath`. Throws a 403 with admin guidance (set `REPO_BROWSE_ROOT` / pick a folder within it) when `repoPath` is outside the root.

## Data structures / Types / Constants
- None beyond the `REPO_BROWSE_ROOT` env var and `os.homedir()` default.

## Important algorithms
Path containment via `path.relative` inspection (rejecting `..` climbs and absolute/cross-drive results) — a standard directory-traversal defense.

## Relationships
Consumes `httpError.ts`. Used by folder-picker routes (`resolveWithinRepoRoot`), and by git/changelog-generation code that trusts a stored `repoPath` (`assertRepoPathAllowed`).

## Edge cases & known limitations
- The jail is only as tight as `REPO_BROWSE_ROOT`; the default (home directory) is broad.
- Cross-drive paths on Windows are treated as outside the root (absolute relative path).
- Does not resolve symlinks; a symlink inside the root pointing outside is not detected by the relative-path check.
