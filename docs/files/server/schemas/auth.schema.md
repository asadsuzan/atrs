# `server/src/schemas/auth.schema.ts`
**Purpose:** Zod validation for authentication and account flows.
**Language / Size:** TypeScript

## Imports
- `z` from zod

## Exports (Zod schemas), all `{ body }`
| Schema | Fields & rules |
| --- | --- |
| registerSchema | name: string min1('Name is required') max120; email: email('Invalid email address'); password: string min8('Password must be at least 8 characters') max200 |
| loginSchema | email: email; password: string min1('Password is required') |
| emailOnlySchema | email: email |
| changePasswordSchema | currentPassword: string min1; newPassword: string min8 max200 |
| updateMeSchema | name: string min1 max120 optional; jobTitle: string max120 optional |

## Relationships
- Validates payloads for the `User` model / auth endpoints.
