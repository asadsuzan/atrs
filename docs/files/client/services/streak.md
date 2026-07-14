# `client/src/services/streak.ts`
**Purpose:** Personal logging-streak API — read the caller's streak stats (timezone-bucketed), add a daily journal entry, delete an entry.
**Language / Size:** TS / 1146 bytes

## Exports
Types: `StreakDay` (`{ date, logged }`), `DailyLogNote` (`{ _id, note, createdAt }`), `StreakStats` (`{ currentStreak, bestStreak, todayLogged, todayCount, totalActiveDays, last7: StreakDay[], todayNotes: DailyLogNote[] }`).
Functions: `getLoggingStreak`, `logToday`, `deleteLog`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api`.

## Functions
- **`getLoggingStreak(): Promise<StreakStats>`** — `GET /api/streak`; query `{ tzOffset: new Date().getTimezoneOffset() }` so the server buckets days in the caller's local timezone.
- **`logToday(note: string): Promise<any>`** — `POST /api/streak/log`; body `{ note }`.
- **`deleteLog(id: string): Promise<any>`** — `DELETE /api/streak/log/{id}`.

## Error handling
None explicit; axios rejections propagate.

## Relationships
- Consumed by the Dashboard streak widget / daily-log journal UI.
- Backend target: `/api/streak/*`.
