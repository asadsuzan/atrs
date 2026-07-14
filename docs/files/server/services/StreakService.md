# `server/src/services/StreakService.ts`
**Purpose:** Powers the daily-logging habit — a personal work journal (DailyLog collection, independent of the changelog/Activity schema) with timezone-aware streak statistics (current/best streak, last-7-days, today's notes).
**Language / Size:** TypeScript / 5311 bytes

## Exports
- `interface StreakDay` — `{ date: string (YYYY-MM-DD, local); logged: boolean }`.
- `interface StreakStats` — `{ currentStreak, bestStreak, todayLogged, todayCount, totalActiveDays, last7: StreakDay[], todayNotes: {_id, note, createdAt}[] }`.
- `class StreakService` — the service (consumer: StreakController).

(Module-private helpers: `tzFromOffset`, `minusDays`, `clampOffset`.)

## Imports (Internal / External)
Internal:
- `../models/DailyLog` (DailyLog, IDailyLog)
- `../types/auth` (AuthUser type)

External: `mongoose` (Types.ObjectId), Mongoose statics (create, findById, aggregate, find), Date/UTC arithmetic.

## Functions / Methods
- **tzFromOffset(offsetMinutes): string** (module-private) — converts JS `getTimezoneOffset()` minutes (minutes to ADD to local to reach UTC, e.g. Dhaka = -360) into an IANA-style numeric offset FROM UTC like `"+06:00"`, flipping the sign. Pads hours/minutes to 2 digits.
- **minusDays(day, n): string** (module-private) — `YYYY-MM-DD` minus n days via UTC (`T00:00:00Z`, setUTCDate) to dodge DST edges; returns YYYY-MM-DD.
- **clampOffset(tzOffsetMinutes): number** (module-private) — clamps to ±840 (±14h) and `Math.trunc(...) || 0`, guarding against bogus client offsets.
- **logToday(note, user): Promise<IDailyLog>** — `DailyLog.create({ ownerId: user.id, note })`. One journal entry per call. DB write.
- **deleteLog(id, user): Promise<IDailyLog | null>** — findById; returns null if missing OR `log.ownerId.toString() !== user.id` (strictly owner-only, even admins cannot delete others' notes; unknown vs not-owned both return null → 404, not probeable). Otherwise `log.deleteOne()` and returns the doc. DB write.
- **getLoggingStreak(user, tzOffsetMinutes): Promise<StreakStats>** — the main analytics method (see Important algorithms). Scoped to `user.id` only. DB reads (aggregate + find).

## Data structures / Types / Constants
- `StreakDay`, `StreakStats` (exported interfaces, above).
- Offset clamp bounds: `[-840, 840]` minutes.
- todayNotes cap: 5 entries (`.limit(5)`), selecting `note createdAt`.

## Important algorithms
### Timezone-aware streak computation — `getLoggingStreak`
1. `offset = clampOffset(tzOffsetMinutes)`; `tz = tzFromOffset(offset)`; `ownerId` as ObjectId.
2. Aggregate the user's DailyLog docs: `$match {ownerId}` → `$group` by `$dateToString('%Y-%m-%d', $createdAt, timezone: tz)` with `count: $sum 1` → `$sort _id: -1`. Gives distinct logged days (in the caller's timezone) with counts, newest-first.
3. `countByDay` Map from those rows. `today` = `new Date(Date.now() - offset*60000)` truncated to YYYY-MM-DD (today in caller's tz).
4. **Current streak:** `todayLogged = countByDay.has(today)`. Cursor starts at today (if logged) else yesterday — an unlogged *today* does NOT break the streak yet (grace until midnight). Walk `minusDays` while `countByDay.has(cursor)`, counting.
5. **Best streak:** scan desc-sorted `rows`, tracking consecutive runs (a day continues the run when `minusDays(prev, 1) === day`), taking the max; finally `Math.max(bestStreak, currentStreak)`.
6. **last7:** 7 entries oldest-first ending today, `{ date, logged: countByDay.has(date) }`.
7. **todayNotes:** `startOfTodayUtc` = midnight-in-caller-tz expressed as a UTC instant (`${today}T00:00:00Z` + offset*60000); `DailyLog.find({ownerId, createdAt: {$gte}})` newest-first, limit 5, select note/createdAt, lean. Mapped to `{ _id: String, note, createdAt }`.
8. Returns full StreakStats (`todayCount = countByDay.get(today) || 0`, `totalActiveDays = rows.length`).

## Relationships
- Called by: StreakController (log entry, delete entry, streak dashboard card).
- Models: DailyLog only — deliberately separate from Activity/changelog data.
- No audit logging, no notifications, no cross-service calls.

## Edge cases & known limitations
- All operations are strictly self-scoped by `user.id`; admins have no cross-user access to journals (by design — it's a private habit).
- Bogus/oversized client timezone offsets are clamped to ±14h (falls back to 0 if NaN).
- Streak has a same-day grace period: not logging today doesn't break the current streak until the calendar day rolls over in the caller's timezone.
- todayNotes is capped at 5; the card shows a subset, not the full day's log.
- Day bucketing depends on the client-supplied tz offset; a wrong offset shifts which calendar day entries fall into.
