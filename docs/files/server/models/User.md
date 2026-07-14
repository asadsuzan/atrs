# `server/src/models/User.ts`
**Purpose / Collection name:** Application user (admin or user) with auth, GitHub token, and password-lifecycle fields. Collection: `users`.
**Language / Size:** TypeScript / 3260 bytes

## Mongoose Schema — Fields
| Field | Type | Required | Default | Ref | Index | Notes/enum/validation |
| --- | --- | --- | --- | --- | --- | --- |
| name | String | yes | — | — | — | trim |
| email | String | yes | — | — | unique + index | lowercase, trim |
| jobTitle | String | no | '' | — | — | trim; presenter subtitle on report decks |
| passwordHash | String | yes | — | — | — | deleted in toJSON |
| role | String | no | 'user' | — | — | enum: admin, user |
| status | String | no | 'pending' | — | — | enum: pending, active, suspended |
| isRoot | Boolean | no | false | — | — | |
| mustChangePassword | Boolean | no | false | — | — | one-time password forces self-set |
| passwordResetRequested | Boolean | no | false | — | — | |
| passwordResetRequestedAt | Date | no | — | — | — | |
| passwordChangedAt | Date | no | — | — | — | JWTs issued before this are rejected |
| githubToken | String | no | — | — | — | `select: false`; encrypted at rest; deleted in toJSON |
| githubLogin | String | no | — | — | — | GitHub username; safe to display |
| githubConnectedAt | Date | no | — | — | — | |
| createdAt / updatedAt | Date | — | auto | — | — | via `{ timestamps: true }` |

Schema options: `{ timestamps: true, toJSON: { transform } }` — transform deletes `passwordHash`, `githubToken`, `__v`.

## Indexes (schema.index(...) calls)
None. Field-level: `email` unique + index.

## Virtuals / Methods / Hooks (pre/post middleware)
- Method `comparePassword(candidate): Promise<boolean>` — `bcrypt.compare(candidate, this.passwordHash)`.
- No pre/post hooks. Password hashing done externally via exported `hashPassword`.

## TypeScript interface(s) exported
- `UserRole` = 'admin' | 'user'; `UserStatus` = 'pending' | 'active' | 'suspended'
- `IUser extends Document` — full field set + `comparePassword` method

## Other exports / logic
- `hashPassword(plain): Promise<string>` — bcrypt hash.
- `BCRYPT_ROUNDS` = clamp(parseInt(env `BCRYPT_ROUNDS`) || 12, min 10, max 15).

## Relationships (refs to other models)
None (referenced by most other models via ownerId/userId).
