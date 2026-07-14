# Timezone-Aware Streak Calculation

**Source:** `server/src/services/StreakService.ts` — `getLoggingStreak`, with
module-private helpers `tzFromOffset`, `minusDays`, `clampOffset`. Consumer:
`StreakController` (dashboard streak card). Data: the `DailyLog` collection
(a private work journal, independent of Activity/changelog data).

## Purpose
Compute a user's daily-logging streak statistics (current streak, best streak,
last-7-days, today's notes) correctly across timezones, with a same-day grace
period so an as-yet-unlogged *today* doesn't prematurely break the streak.

## Inputs / Outputs
- **In:** `user` (self-scoped by `user.id`), `tzOffsetMinutes` (the client's
  `Date.getTimezoneOffset()`).
- **Out:** `StreakStats { currentStreak, bestStreak, todayLogged, todayCount,
  totalActiveDays, last7: StreakDay[], todayNotes[] }`.

## Algorithm
1. **Sanitize offset.** `offset = clampOffset(tzOffsetMinutes)` — `Math.trunc`,
   `|| 0`, clamped to ±840 min (±14h) to reject bogus client values.
   `tz = tzFromOffset(offset)` converts JS offset-minutes (minutes to *add* to
   local to reach UTC) into an IANA-style `"+06:00"` string, flipping the sign.
2. **Bucket by local day.** Aggregate the user's `DailyLog`:
   `$match {ownerId}` → `$group` by
   `$dateToString('%Y-%m-%d', $createdAt, timezone: tz)` with `count:$sum 1` →
   `$sort _id:-1`. Yields distinct logged calendar days (in the caller's tz),
   newest-first, with per-day counts. Build a `countByDay` Map.
3. **Determine "today".** `today = new Date(Date.now() - offset*60000)`
   truncated to `YYYY-MM-DD` (today in the caller's tz).
4. **Current streak.** `todayLogged = countByDay.has(today)`. The cursor starts
   at `today` if logged, else at yesterday (`minusDays(today,1)`) — so an
   unlogged today does **not** break the streak yet (grace until local midnight).
   Walk backwards via `minusDays` while `countByDay.has(cursor)`, counting.
5. **Best streak.** Scan the desc-sorted rows tracking consecutive runs (a day
   continues a run when `minusDays(prev,1) === day`), keep the max, then
   `Math.max(bestStreak, currentStreak)`.
6. **last7.** 7 entries, oldest-first, ending at today:
   `{ date, logged: countByDay.has(date) }`.
7. **todayNotes.** `startOfTodayUtc` = local midnight expressed as a UTC instant
   (`${today}T00:00:00Z` + offset*60000); `DailyLog.find({ownerId, createdAt:
   {$gte}})`, newest-first, `.limit(5)`, select `note createdAt`, lean.

`minusDays` does date math in UTC (`T00:00:00Z`, `setUTCDate`) to avoid DST
edges.

## Complexity / performance
- One aggregation + one find per call. Streak walks are O(streak length) /
  O(active days) Map lookups. No cross-collection joins.

## Edge cases & limitations
- **Strictly self-scoped:** admins cannot see others' journals (by design).
- **Grace period:** not logging today doesn't break the current streak until the
  calendar day rolls over in the caller's tz.
- **Offset dependence:** a wrong client tz offset shifts which calendar day an
  entry falls into; bogus offsets are clamped to ±14h (or 0 if NaN).
- **todayNotes capped at 5** — the card shows a subset, not the full day.

## Source references
- `StreakService.getLoggingStreak`, `tzFromOffset`, `minusDays`, `clampOffset`.
- Model: `server/src/models/DailyLog.ts`.
