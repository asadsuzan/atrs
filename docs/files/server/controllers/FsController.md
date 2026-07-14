# `server/src/controllers/FsController.ts`
**Purpose:** Server-side directory browser (jailed to the repo-browse root) powering the product form's folder picker for local repo paths.
**Language / Size:** TypeScript / 2197 bytes
## Exports
Named export: `browseDirs`. Module constant `MAX_ENTRIES = 2000`.
## Imports (Internal / External)
- Internal: `../utils/repoAccess` (`getRepoRoot`, `isWithinRepoRoot`).
- External: `express`, `fs`, `path`.
## Handlers / Functions
- **browseDirs(req,res,next)** — GET /api/products/browse-dirs?path=<dir>. Reads `req.query.path`. No Zod. Resolves `current`: if `path` present and `isWithinRepoRoot`, `path.resolve(raw)`, else snaps to `getRepoRoot()`. `fs.statSync` → `400 'Path not found'` on failure; `400` if not a directory. `fs.readdirSync(withFileTypes)` → `403 'permission denied'` on failure. Filters to directories, maps to `{name, path}`, sorts case-insensitively, slices to `MAX_ENTRIES`. Computes `parent` (null at root). Responds `{path, parent, sep, isRoot, home, drives:[], dirs}`.
## Important logic & design patterns
- Path-jail security: browsing confined to `REPO_BROWSE_ROOT` (OS home by default); out-of-jail input snaps back to root, never exposes a parent above root; only directory names returned (no file contents).
- Defensive stat/readdir error mapping to 400/403.
## Relationships
- Routed by `productRoutes.ts` as `GET /:.../browse-dirs` (mounted `/api/products`, behind `requireAuth`+`requireActive`).
- Depends on `repoAccess` util (shared with ChangelogGenController's repo jail).
