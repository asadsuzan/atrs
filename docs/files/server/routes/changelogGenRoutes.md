# `server/src/routes/changelogGenRoutes.ts`
**Purpose:** Express router for AI/LLM changelog generation; mounted at `/api/changelog-gen` (app.ts: `app.use('/api/changelog-gen', requireAuth, requireActive, changelogGenRoutes)`).
**Language / Size:** TypeScript / 833 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` are applied at the mount in `app.ts`.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| POST | `/generate` | validate | `generateChangelogSchema` | `ChangelogGenController.generate` |
| GET | `/tags/:productId` | validate | inline `z.object({ params: z.object({ productId: objectId }) })` | `ChangelogGenController.getTags` |
| GET | `/models` | — | — | `ChangelogGenController.getModels` |
## Relationships
- Controller: `../controllers/ChangelogGenController`.
- Schemas: `changelogGen.schema` (`generateChangelogSchema`), `common.schema` (`objectId`); an inline Zod schema built in-file for the `:productId` param.
- Middleware: `../middlewares/validate`.
- External: `zod` (`z`).
## Notes
- `/generate` is an SSE-streamed pipeline execution (per the file comment).
- `/tags/:productId` lists git tags for a dropdown; `/models` lists Ollama models.
