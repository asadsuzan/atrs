# `server/src/services/GitHubService.ts`
**Purpose:** Manages a user's GitHub connection (validate + encrypt token, status, disconnect) and syncs a product's GitHub Releases into Version documents idempotently.
**Language / Size:** TypeScript / 5158 bytes

## Exports
- `interface GitHubStatus` — `{ connected: boolean; login: string | null; connectedAt: Date | null }`.
- `interface ReleaseSyncResult` — `{ repo: string; total: number; created: number; updated: number; skipped: number }`.
- `class GitHubService` — the service (consumer: GitHub controller/routes).

## Imports (Internal / External)
Internal:
- `../models/User` (User), `../models/Product` (Product), `../models/Version` (Version)
- `./AuditLogService` (AuditLogService — instantiated at module scope as `auditLogService`)
- `../utils/ownership` (assertOwner)
- `../utils/crypto` (encryptSecret, decryptSecret)
- `../utils/github` (getAuthenticatedUser, listReleases, parseRepo)
- `../utils/httpError` (createHttpError, default import)
- `../types/auth` (AuthUser type)

External: GitHub REST API (indirectly, via `../utils/github` helpers), Mongoose model statics (findById, findByIdAndUpdate, findOne, create, save).

## Functions / Methods
- **connect(token, user): Promise<GitHubStatus>** — trims token; 400 if empty. Validates via `getAuthenticatedUser(trimmed)` (throws on bad token, so a dud is never stored). Then `User.findByIdAndUpdate(user.id, ...)` storing `githubToken: encryptSecret(trimmed)`, `githubLogin: login`, `githubConnectedAt: new Date()`. Returns `{connected:true, login, connectedAt}`. Side effects: external API call, DB write.
- **disconnect(user): Promise<void>** — `User.findByIdAndUpdate(user.id, { $unset: { githubToken, githubLogin, githubConnectedAt } })`. DB write.
- **getStatus(user): Promise<GitHubStatus>** — `User.findById(user.id).select('+githubToken githubLogin githubConnectedAt')`; `connected = !!account?.githubToken`; returns login/connectedAt only when connected (else null). DB read only. Does not decrypt the token.
- **requireToken(user): Promise<string>** (private) — loads `select('+githubToken')`; 400 'No GitHub account connected…' if absent; returns `decryptSecret(account.githubToken)`; on decrypt throw returns 400 'Stored GitHub token could not be read. Reconnect…' (forces reconnect on rotated/corrupted secret).
- **syncReleases(productId, user): Promise<ReleaseSyncResult>** — see Important algorithms. Fetches releases and upserts Version rows matched by `source:'github'` + `externalId`. Side effects: DB reads/writes, audit log UPDATE/PRODUCT.

## Data structures / Types / Constants
- Module-scope singleton `auditLogService = new AuditLogService()`.
- `GitHubStatus`, `ReleaseSyncResult` (exported interfaces).
- Per-release `fields` object written to Version: `{ label, notes, status:'released', releasedAt, author, externalUrl }`.

## Important algorithms

### GitHub Releases → Versions sync — `syncReleases`
1. `Product.findById(productId)`; `assertOwner(product, user)` (404s for non-owners; admins pass).
2. `parseRepo(product.githubUrl)`; 400 'This product has no valid GitHub repository URL.' if unparseable.
3. `requireToken(user)` (decrypted), then `listReleases(token, owner, repo)`.
4. For each release: `label = tagName || name`; if neither, `skipped++` and continue. `externalId = String(r.id)`.
5. Lookup `Version.findOne({ productId, source:'github', externalId })`.
   - If existing: overwrites only upstream-owned fields (`notes`, `releasedAt`, `author`, `externalUrl`) and `save()`; `updated++`. The `label` is deliberately NOT overwritten so a user rename survives.
   - Else: `Version.create({ ...fields, productId, ownerId: product.ownerId, source:'github', externalId })`; `created++`.
6. Audit log UPDATE/PRODUCT with a summary message `Synced <created> new / <updated> updated version(s) from GitHub (owner/repo)`.
7. Returns `{ repo: 'owner/repo', total: releases.length, created, updated, skipped }`.

Idempotent: each release maps to exactly one Version via (source, externalId); re-running only adds new releases and refreshes existing github-sourced rows. Manual (non-github) versions are never touched.

## Relationships
- Models: User (token storage), Product (ownership + githubUrl), Version (sync target).
- Utils: crypto (encrypt/decrypt at rest), github (API helpers), ownership (assertOwner), httpError.
- Services: AuditLogService.
- External: GitHub REST API through `../utils/github`.

## Edge cases & known limitations
- Token is validated before storage (no dud stored) and encrypted at rest; a decrypt failure surfaces as a 400 asking the user to reconnect rather than a 500.
- Existing versions keep a user-renamed `label`; only notes/date/author/url are refreshed on re-sync.
- Releases with neither a tag name nor a name are counted as `skipped`, not errors.
- `syncReleases` processes releases sequentially with an awaited findOne + write per release (no bulk write).
