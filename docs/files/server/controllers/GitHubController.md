# `server/src/controllers/GitHubController.ts`
**Purpose:** Per-user GitHub connection (status/connect/disconnect) and syncing a product's GitHub Releases into Versions.
**Language / Size:** TypeScript / 1458 bytes
## Exports
Named exports: `getStatus`, `connect`, `disconnect`, `syncReleases`.
## Imports (Internal / External)
- Internal: `../services/GitHubService` (`GitHubService`).
- External: `express`.
- Module-level singleton: `const githubService = new GitHubService()`.
## Handlers / Functions
- **getStatus(req,res,next)** — Reads `req.user`. Calls `githubService.getStatus(req.user!)`. `200` with connection status.
- **connect(req,res,next)** — Reads `req.body.token` (`connectGithubSchema`), `req.user`. Calls `githubService.connect(token, req.user!)` (stores encrypted, validates). `200` with status.
- **disconnect(req,res,next)** — Reads `req.user`. Calls `githubService.disconnect(req.user!)`. `200 {connected:false, login:null, connectedAt:null}`.
- **syncReleases(req,res,next)** — Reads `req.params.id` (`syncReleasesSchema`), `req.user`. Calls `githubService.syncReleases(id, req.user!)`. `200` with result.
## Important logic & design patterns
- Thin delegation to `GitHubService`; token stored encrypted and scoped to the caller.
## Relationships
- Routed by `githubRoutes.ts` (mounted `/api/github`, behind `requireAuth`+`requireActive`).
- Delegates to `GitHubService`.
