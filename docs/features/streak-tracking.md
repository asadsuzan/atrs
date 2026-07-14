# Streak Tracking

**Summary:** A personal, private daily work journal with timezone-aware streak statistics, surfaced as the Dashboard `StreakCard`; each user logs short "what I worked on today" notes and sees current/best streaks, a 7-day trail, and today's notes — data lives in its own `DailyLog` collection, fully isolated per user.

## User-facing entry points
- **Dashboard `StreakCard`** (rendered on `/` by `Dashboard.tsx`) — the only UI surface. Shows the streak flame, a 7-day dot trail, an inline "log what you worked on" input, today's notes as removable chips, and a confetti + sound + milestone-toast reward on the first log of the day.

## Client pieces
**Component**
- `client/src/components/dashboard/StreakCard.tsx` — self-contained widget, no props.
  - React Query: `useQuery<StreakStats>(['streak'])` → `getLoggingStreak`.
  - Mutations: `logMutation` (`logToday`) and `deleteMutation` (`deleteLog`); both invalidate `['streak']` on success. First-log-of-day (detected via `!streak?.todayLogged`) triggers confetti (`burstId`) + a milestone/"streak extended" toast.
  - Local state: `note` (input), `burstId` (confetti trigger). Module consts `MILESTONES` (3/7/14/30/50/100) and `CONFETTI_COLORS`.
  - Handlers: `handleLog` requires `note.trim().length >= 3` (else error toast); `handleDeleteNote(id)`; Enter key logs.

**Service**
- `client/src/services/streak.ts` — types `StreakDay`, `DailyLogNote`, `StreakStats`; functions:
  - `getLoggingStreak()` → `GET /api/streak` with query `{ tzOffset: new Date().getTimezoneOffset() }` so the server buckets days in the caller's local timezone.
  - `logToday(note)` → `POST /api/streak/log` body `{ note }`.
  - `deleteLog(id)` → `DELETE /api/streak/log/{id}`.

**Contexts:** none — the card depends only on the streak service and `@/lib/sound` (`playSound`). It is not an App.tsx global surface.

## Server pieces
Route → controller → service; guarded at the mount by `requireAuth` + `requireActive`.
- `server/src/routes/streakRoutes.ts` — mounted `app.use('/api/streak', requireAuth, requireActive, streakRoutes)`.
  - `GET /` → `StreakController.getLoggingStreak`
  - `POST /log` → `validate(createDailyLogSchema)` → `StreakController.createDailyLog`
  - `DELETE /log/:id` → `validate(idParamSchema)` → `StreakController.deleteDailyLog`
- `server/src/controllers/StreakController.ts` — thin delegation:
  - `getLoggingStreak`: reads `req.query.tzOffset` (`parseInt`, default 0), calls `streakService.getLoggingStreak(user, tzOffset)` → `200`.
  - `createDailyLog`: `streakService.logToday(note, user)` → `201`.
  - `deleteDailyLog`: `streakService.deleteLog(id, user)` → `404 { message: 'Note not found' }` if null, else `200 { message: 'Note deleted' }`.
- `server/src/services/StreakService.ts` — reads/writes `DailyLog` only:
  - `logToday(note, user)` → `DailyLog.create({ ownerId: user.id, note })`.
  - `deleteLog(id, user)` → `findById`; returns null (→ 404) if missing OR `log.ownerId.toString() !== user.id` (strictly owner-only; unknown vs not-owned are indistinguishable, not probeable); else `deleteOne()`.
  - `getLoggingStreak(user, tzOffsetMinutes)` — the analytics method (see algorithm below), scoped to `user.id` only.
  - Private helpers: `tzFromOffset` (JS offset minutes → IANA-style `±HH:MM`, sign flipped), `minusDays` (UTC date math to dodge DST), `clampOffset` (±840 min / ±14h).

**Validation:** `server/src/schemas/streak.schema.ts` — `createDailyLogSchema.body.note`: string, trim, min 3 ("Tell us what you worked on"), max 500.

**Auth guards:** `requireAuth` + `requireActive` at the mount; all data is strictly self-scoped by `req.user.id` in the service — admins have no cross-user access by design.

## Data model
- **DailyLog** (`dailylogs`) — one journal entry:
  - `ownerId` (ObjectId → User, required, indexed)
  - `note` (String, required)
  - `createdAt` (auto; `timestamps: { createdAt: true, updatedAt: false }`)
  - Compound index `{ ownerId: 1, createdAt: -1 }` for per-day streak aggregation.
- Deliberately independent of `Product`/`Activity`/changelog data — a private habit log, not tied to shipped work.
- `StreakStats` (returned, not stored): `{ currentStreak, bestStreak, todayLogged, todayCount, totalActiveDays, last7: StreakDay[], todayNotes: {_id, note, createdAt}[] }`.

## Notable behaviors & edge cases
- **Timezone-aware bucketing:** `getLoggingStreak` aggregates via `$dateToString('%Y-%m-%d', $createdAt, timezone: tz)` where `tz` is derived from the client-supplied `tzOffset`. A wrong/missing offset shifts which calendar day entries fall into (falls back to 0/UTC).
- **Same-day grace period:** an unlogged *today* does NOT break the current streak — the walk starts at today (if logged) else yesterday, so the streak survives until the calendar day rolls over in the caller's timezone.
- **Current vs best streak:** current = consecutive-day walk backward from today/yesterday via `minusDays`; best = max consecutive run across all logged days, then `max(bestStreak, currentStreak)`.
- **Offset hardening:** bogus/oversized offsets are clamped to ±14h (`Math.trunc(...) || 0`).
- **todayNotes cap:** at most 5 entries (`.limit(5)`, newest-first), computed from `startOfTodayUtc` (midnight-in-caller-tz expressed as a UTC instant). The card shows a subset, not necessarily the full day's log.
- **Strict ownership on delete:** even admins cannot delete another user's notes; missing and not-owned both return null → 404 (existence not probeable).
- **Client min-length:** `handleLog` enforces `note.trim().length >= 3` client-side, mirroring the server Zod `min(3)`.
- **No audit logging / notifications:** the streak service makes no cross-service calls — it is purely self-contained.
- **Reward loop:** deterministic confetti (seeded by index + `burstId`) avoids layout thrash; milestone toast fires only on the first log of the day.

## Related docs
- Per-file: [StreakCard](../files/client/components/dashboard/StreakCard.md), [streak service](../files/client/services/streak.md), [streakRoutes](../files/server/routes/streakRoutes.md), [StreakController](../files/server/controllers/StreakController.md), [StreakService](../files/server/services/StreakService.md), [DailyLog model](../files/server/models/DailyLog.md), [streak.schema](../files/server/schemas/streak.schema.md)
- Feature: [Reports & Dashboard](./dashboard-and-insights.md) (host page for the StreakCard)
- API: [Server API reference §9 Streak](../api/server-api-endpoints.md), [Client → Endpoint map](../api/client-endpoint-map.md)
