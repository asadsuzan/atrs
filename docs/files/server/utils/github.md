# `server/src/utils/github.ts`
**Purpose:** Thin fetch-based GitHub REST client (no SDK) used by release sync — parses repo URLs, validates tokens, and lists releases for public/private/org repos. Supports GitHub Enterprise via `GITHUB_API_URL`.
**Language / Size:** TypeScript / 4785 bytes

## Exports
- `interface GitHubRelease`
- `function parseRepo(githubUrl): { owner: string; repo: string } | null`
- `async function getAuthenticatedUser(token): Promise<{ login: string }>`
- `async function listReleases(token, owner, repo, maxPages = 5): Promise<GitHubRelease[]>`

## Imports (Internal / External)
- Internal: `createHttpError` (default) from `./httpError`.
- External: global `fetch`, `AbortController` (node runtime).

## Functions / Methods
### `parseRepo(githubUrl)`
Extracts `{owner, repo}` from a github.com URL (https/ssh) or bare `owner/repo` shorthand. Trims input, matches with `/(?:github\.com[/:])?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i` (strips trailing `.git` and slash). Returns null for missing input, no match, or when `owner` equals `github.com` (guards against matching a single bare segment).

### `ghFetch(token, path)` (private)
Performs an authenticated GET to `API_BASE + path` with a 10s timeout via `AbortController`/`setTimeout` (cleared in `finally`). Sends headers: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, and the fixed `User-Agent`.

### `raiseForStatus(res, context): never` (private)
Maps non-OK responses to user-facing `HttpError`s:
- 401 → 401 "GitHub token is invalid or expired."
- 403 → 429 "rate limit reached" when `x-ratelimit-remaining` header is `'0'`; otherwise 403 with SSO/scope guidance.
- 404 → 404 "not found, or the connected token cannot access it".
- anything else → 502 generic GitHub API error including the status.

### `getAuthenticatedUser(token)`
GETs `/user`; on non-OK calls `raiseForStatus(res, 'GitHub user')`. Returns `{ login: String(data.login) }`. Used to validate a token and identify the connected account.

### `listReleases(token, owner, repo, maxPages = 5)`
Paginates `/repos/{owner}/{repo}/releases?per_page=100&page=N` for up to `maxPages`. On non-OK, raises via `raiseForStatus`. Breaks when a batch is empty/non-array. **Skips drafts** (`r.draft`). Maps each release into `GitHubRelease`, with fallbacks: `name` ← `name || tag_name`, `publishedAt` ← `published_at || created_at || null`, `author` ← `author?.login || ''`. Stops early when a batch has fewer than 100 items.

## Data structures / Types / Constants
- `API_BASE`: `process.env.GITHUB_API_URL || 'https://api.github.com'` with trailing slashes stripped.
- `UA = 'ATRS/1.0 (+https://bplugins.com)'`.
- `TIMEOUT_MS = 10000`.
- `GitHubRelease`: `{ id, tagName, name, body, draft, prerelease, publishedAt, author, htmlUrl }`.

## Important algorithms
Cursor-style pagination with early termination (empty batch or partial page). Per-request timeout via `AbortController`. Status-to-message mapping centralized in `raiseForStatus`, including the rate-limit-vs-permission disambiguation on 403.

## Relationships
Consumes `httpError.ts`. Used by GitHub release import/sync routes and services. Env var `GITHUB_API_URL` enables self-hosted GitHub Enterprise.

## Edge cases & known limitations
- Draft releases are always excluded; prereleases are kept (flagged via `prerelease`).
- 403 disambiguation relies solely on the `x-ratelimit-remaining` header being exactly `'0'`.
- `maxPages` defaults to 5 → at most 500 releases fetched.
- No retry/backoff; a transient failure surfaces as an HttpError immediately.
