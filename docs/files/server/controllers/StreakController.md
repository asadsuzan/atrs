# `server/src/controllers/StreakController.ts`
**Purpose:** Personal daily-logging habit: fetch streak stats, log today, delete a daily log note.
**Language / Size:** TypeScript / 1174 bytes
## Exports
Named exports: `getLoggingStreak`, `createDailyLog`, `deleteDailyLog`.
## Imports (Internal / External)
- Internal: `../services/StreakService` (`StreakService`).
- External: `express`.
- Module-level singleton: `streakService`.
## Handlers / Functions
- **getLoggingStreak(req,res,next)** — Reads `req.query.tzOffset` (`parseInt`, default 0 — client `getTimezoneOffset()`), `req.user`. `streakService.getLoggingStreak(req.user!, tzOffset)`. `200`.
- **createDailyLog(req,res,next)** — Reads `req.body.note` (route Zod `createDailyLogSchema`), `req.user`. `streakService.logToday(note, req.user!)`. `201`.
- **deleteDailyLog(req,res,next)** — Reads `req.params.id` (`idParamSchema`), `req.user`. `streakService.deleteLog(id, req.user!)`. `404 {message:'Note not found'}` if null; else `200 {message:'Note deleted'}`.
## Important logic & design patterns
- Timezone-aware streak computation driven by client-supplied `tzOffset`.
- Thin delegation with owner scoping in the service.
## Relationships
- Routed by `streakRoutes.ts` (mounted `/api/streak`, behind `requireAuth`+`requireActive`).
- Delegates to `StreakService`.
