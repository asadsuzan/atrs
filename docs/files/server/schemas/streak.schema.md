# `server/src/schemas/streak.schema.ts`
**Purpose:** Zod validation for creating a daily-log entry (logging-streak feature).
**Language / Size:** TypeScript

## Imports
- `z` from zod

## Exports (Zod schemas)
- `createDailyLogSchema` — `{ body }`

## Fields — createDailyLogSchema.body
| Field | Rule |
| --- | --- |
| note | string trim min3('Tell us what you worked on') max500 |

## Relationships
- Validates payloads for the `DailyLog` model.
