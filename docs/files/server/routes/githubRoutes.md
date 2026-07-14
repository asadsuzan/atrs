# `server/src/routes/githubRoutes.ts`
**Purpose:** Express router for per-user GitHub connection and pulling GitHub Releases into a product's Versions; mounted at `/api/github` (app.ts: `app.use('/api/github', requireAuth, requireActive, githubRoutes)`).
**Language / Size:** TypeScript / 734 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` are applied at the mount in `app.ts`.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| GET | `/status` | — | — | `GitHubController.getStatus` |
| POST | `/connect` | validate | `connectGithubSchema` | `GitHubController.connect` |
| DELETE | `/connect` | — | — | `GitHubController.disconnect` |
| POST | `/products/:id/sync-releases` | validate | `syncReleasesSchema` | `GitHubController.syncReleases` |
## Relationships
- Controller: `../controllers/GitHubController`.
- Schemas: `github.schema` (`connectGithubSchema`, `syncReleasesSchema`).
- Middleware: `../middlewares/validate`.
## Notes
- GitHub token is stored encrypted and scoped to the calling user (per file comment).
- `syncReleasesSchema` validates both the `:id` param and the sync body.
