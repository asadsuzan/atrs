# `server/src/schemas/github.schema.ts`
**Purpose:** Zod validation for connecting a GitHub token and syncing product releases.
**Language / Size:** TypeScript

## Imports
- `z` from zod; `objectId` from `./common.schema`

## Exports (Zod schemas)
- `connectGithubSchema` — `{ body: { token } }`
- `syncReleasesSchema` — `{ params: { id } }`

## Fields
| Schema | Field | Rule |
| --- | --- | --- |
| connectGithubSchema | token | string min1('A GitHub token is required') |
| syncReleasesSchema | params.id | objectId |

## Relationships
- token → stored on `User.githubToken`; sync writes to `Version` (source 'github').
