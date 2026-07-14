# `server/src/models/AppConfig.ts`
**Purpose / Collection name:** Singleton document holding runtime app config (contents of `app.config.json`) for read-only-filesystem deployments (Vercel). Locally the on-disk file is the source of truth. Collection: `appconfigs`.
**Language / Size:** TypeScript / 722 bytes

## Mongoose Schema — Fields
| Field | Type | Required | Default | Ref | Index | Notes/enum/validation |
| --- | --- | --- | --- | --- | --- | --- |
| singleton | String | yes | 'app' | — | unique | Only one document ('app') |
| data | Mixed | yes | {} | — | — | `Record<string, any>` |
| updatedAt | Date | — | auto | — | — | via `{ timestamps: true }` |

Schema options: `{ timestamps: true, minimize: false }` (minimize:false preserves empty objects in `data`).

## Indexes (schema.index(...) calls)
None. `singleton` has field-level `unique: true`.

## Virtuals / Methods / Hooks (pre/post middleware)
None.

## TypeScript interface(s) exported
- `IAppConfig extends Document` — singleton: 'app', data: Record<string, any>, updatedAt: Date

## Relationships (refs to other models)
None.
