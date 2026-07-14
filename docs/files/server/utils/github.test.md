# `server/src/utils/github.test.ts`
**Purpose:** Unit tests for `parseRepo` from `github.ts` (Vitest).
**Language / Size:** TypeScript / 1254 bytes

## Exports
None (test file).

## Imports (Internal / External)
- Internal: `parseRepo` from `./github`.
- External: `describe`, `it`, `expect` from `vitest`.

## Functions / Methods
Test suite `describe('parseRepo')` covering:
- **standard https URL** — `https://github.com/acme/widget` → `{ owner: 'acme', repo: 'widget' }`.
- **organization repo** — `https://github.com/my-org/some.repo` → `{ owner: 'my-org', repo: 'some.repo' }` (dots and hyphens preserved).
- **trailing `.git` and slash** — both `.../widget.git` and `.../widget/` → `{ owner: 'acme', repo: 'widget' }`.
- **SSH remote** — `git@github.com:acme/widget.git` → `{ owner: 'acme', repo: 'widget' }`.
- **shorthand** — `acme/widget` → `{ owner: 'acme', repo: 'widget' }`.
- **empty / malformed input** — `''`, `undefined`, `'not-a-repo'`, and `'https://github.com/'` all → `null`.

## Data structures / Types / Constants
None.

## Important algorithms
Exercises the regex-based parsing and the guards (trailing-segment stripping, bare-segment rejection) of `parseRepo`.

## Relationships
Tests `github.ts`.

## Edge cases & known limitations
Covers only `parseRepo`; the network functions (`getAuthenticatedUser`, `listReleases`) and error mapping are not tested here.
