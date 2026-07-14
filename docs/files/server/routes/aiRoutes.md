# `server/src/routes/aiRoutes.ts`
**Purpose:** Express router for AI suggestions; mounted at `/api/ai` (app.ts: `app.use('/api/ai', requireAuth, requireActive, aiRoutes)`).
**Language / Size:** TypeScript / 379 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` are applied at the mount in `app.ts` (noted in a file comment).
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| POST | `/suggest` | validate | `aiSuggestSchema` | `AiController.suggest` |
## Relationships
- Controller: `../controllers/AiController` (`suggest`).
- Schema: `ai.schema` (`aiSuggestSchema`).
- Middleware: `../middlewares/validate`.
## Notes
- Single-endpoint router.
