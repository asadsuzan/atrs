# `server/src/routes/streakRoutes.ts`
**Purpose:** Express router for the personal daily-logging habit (private work journal + streak stats, independent of the changelog/Activity schema); mounted at `/api/streak` (app.ts: `app.use('/api/streak', requireAuth, requireActive, streakRoutes)`).
**Language / Size:** TypeScript / 676 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` are applied at the mount in `app.ts`.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| GET | `/` | — | — | `StreakController.getLoggingStreak` |
| POST | `/log` | validate | `createDailyLogSchema` | `StreakController.createDailyLog` |
| DELETE | `/log/:id` | validate | `idParamSchema` | `StreakController.deleteDailyLog` |
## Relationships
- Controller: `../controllers/StreakController`.
- Schemas: `streak.schema` (`createDailyLogSchema`), `common.schema` (`idParamSchema`).
- Middleware: `../middlewares/validate`.
## Notes
- Per-user private data; scoping enforced in controller/service via `req.user`.
