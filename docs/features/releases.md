# Releases & Publishing

**Summary:** Assemble a product's versions + published changelog activities into a single release payload — with ready-to-paste WordPress.org readme and GitHub Markdown exports, a shareable public hosted changelog, and an idempotent sync that pulls GitHub Releases into Versions.

## User-facing entry points
- **Release tab** (`ReleasePublish`, inside `/products/:id`) — toggles for the public changelog page and public-directory listing, copy/download export boxes (readme.txt + Markdown), and a grouped released/unreleased preview.
- **Public hosted changelog** — route `/changelog/:id` (`PublicChangelog.tsx`), no auth, outside the app shell; linked from `/explore` product cards when `publicChangelogEnabled`.
- **GitHub release sync** — triggered from ProductDetails (`syncProductReleases`); connection managed on the Settings page (`connectGithub`/`disconnectGithub`).

## Client pieces
**Pages / components**
- `components/products/ReleasePublish.tsx` — reads the full release payload; `publishMutation`/`directoryMutation` call `updateProduct({ publicChangelogEnabled })` / `updateProduct({ listedInDirectory })` and invalidate `['release', productId]` + `['product', productId]`. `ExportBox` copies via clipboard / downloads via Blob; `ReleaseBlockView` renders per-type groups (`feature, improvement, bug-fix`) with Pro tags and unreleased badges.
- `pages/PublicChangelog.tsx` — vertical timeline; `VersionEntry` per `ReleaseBlock`; handles both block-level "Unreleased" buckets and entry-level `unreleased`-tagged items; short-description dedupe via `htmlToPlainText`. Any fetch error collapses to a single "Changelog not found" state.

**Services**
- `client/src/services/release.ts` — `getProductRelease(id)` → `GET /api/products/:id/release` (authed, includes `formats`); `getPublicChangelog(id)` → raw `fetch GET /api/public/changelog/:id` (no auth, throws a status-bearing `Error('Changelog not found')` on `!res.ok`). Types: `ReleaseType`, `ReleaseItem`, `ReleaseBlock`, `ReleasePayload`.
- `client/src/services/github.ts` — `getGithubStatus`, `connectGithub(token)`, `disconnectGithub`, `syncProductReleases(productId)`. Types `GitHubStatus`, `ReleaseSyncResult` (`{repo,total,created,updated,skipped}`).

**React Query keys**
- `['release', productId]` — authed release payload (ReleasePublish).
- `['public-changelog', id]` — public changelog (`enabled:!!id`, `retry:false`).
- `['product', productId]` — invalidated alongside `['release']` on toggle.

## Server pieces
**Release payload**
- `GET /api/products/:id/release` (authed, `productRoutes.ts`, requireAuth+requireActive) → `ReleaseController.getProductRelease` → `ProductService.getProductById` (`assertOwner`, 404) → `ReleaseService.buildRelease(product)` → full payload **including** `formats`.
- `GET /api/public/changelog/:id` (public, `publicRoutes.ts`) → `ReleaseController.getPublicChangelog` → validates ObjectId (404 on malformed), `Product.findById`, 404 `'Changelog not found'` if missing or `!publicChangelogEnabled` → `buildRelease` → `{product, releases, unreleased}` **without** export formats.
- `ReleaseService.buildRelease` — parallel `Version.find({productId, ownerId})` + `Activity.find({productId, ownerId, needsReview:{$ne:true}}).sort({displayOrder:1, activityDate:-1})` (both `ownerId`-scoped against cross-tenant re-parenting; review-pending drafts excluded), then `assembleRelease(...)` and a whitelisted `productView` DTO, plus `formats: { readme: toReadmeChangelog(...), markdown: toMarkdown(...) }`.
- `utils/releaseFormat.ts` (pure) — `assembleRelease` groups activities under their versions (versions with zero activities skipped; unversioned → a single "Unreleased" block), sorts unreleased-first then date-desc then numeric-aware label-desc. `toReadmeChangelog` emits a WP.org `== Changelog ==` block using `New:`/`Improvement:`/`Fix:` keywords (round-trips with the importer's `readmeChangelog.ts`; unversioned block omitted). `toMarkdown` emits `# <product> — Changelog` with per-type `###` sections (unversioned block included).

**GitHub sync**
- Routes `githubRoutes.ts` (mounted `/api/github`, requireAuth+requireActive): `GET /status`, `POST /connect` (validate `connectGithubSchema`), `DELETE /connect`, `POST /products/:id/sync-releases` (validate `syncReleasesSchema`) → `GitHubController` → `GitHubService`.
- `GitHubService.connect` validates the token via `getAuthenticatedUser` before storing it `encryptSecret`-encrypted on `User` (no dud stored). `getStatus` reports connection without decrypting. `requireToken` decrypts and surfaces a 400 "reconnect" on corrupt/rotated secrets.
- `GitHubService.syncReleases` — `assertOwner`, `parseRepo(githubUrl)` (400 if invalid), `listReleases(token, owner, repo)`, then per release upsert a `Version` matched by `{productId, source:'github', externalId}`: create new, or refresh only upstream-owned fields (`notes`, `releasedAt`, `author`, `externalUrl`) while **preserving a user-renamed `label`**. Audit UPDATE/PRODUCT; returns `{repo,total,created,updated,skipped}`.
- `utils/github.ts` — SDK-less fetch client: `parseRepo`, `getAuthenticatedUser`, `listReleases` (paginates `per_page=100`, up to `maxPages=5`, skips drafts, keeps prereleases; 10s timeout; `raiseForStatus` maps 401/403-rate-limit/404/502). Supports GitHub Enterprise via `GITHUB_API_URL`.

**Auth guards:** authed release + all GitHub routes require JWT + active account; public changelog is unauthenticated and gated by `publicChangelogEnabled`.

## Data model
- **`versions`** — `productId`, `ownerId`, `label`, `notes`, `status` (released/unreleased), `releasedAt`, `author`, and for synced rows `source:'github'` + `externalId` + `externalUrl` (upsert key `{productId, source, externalId}`). Version CRUD is a separate feature — cross-link.
- **`activities`** — read for the payload; only `needsReview:{$ne:true}` entries publish, ordered `displayOrder` asc / `activityDate` desc.
- **`products`** — `publicChangelogEnabled` / `listedInDirectory` toggled from ReleasePublish; `githubUrl` read for repo parsing.
- **`users`** — encrypted `githubToken`, `githubLogin`, `githubConnectedAt`.

## Notable behaviors & edge cases
- **Two views of one payload** — authed (full, with `formats`) vs public (trimmed, no formats); malformed ids and unpublished products both return a probe-resistant 404.
- **Review filter** — AI/imported drafts flagged `needsReview` never appear in a published changelog until confirmed.
- **Cross-tenant safety** — child queries add `ownerId` to `productId` so a re-parented record can't leak into another owner's release.
- **Export round-trip** — `toReadmeChangelog` keeps the unreleased marker inside the `= label =` header and uses the same keyword convention as the importer, so exports re-import cleanly; the unversioned "Unreleased" block is omitted from readme output but included in Markdown.
- **GitHub sync is idempotent** — each release maps to exactly one Version via `(source, externalId)`; re-running adds new releases and refreshes github-sourced rows only, never touching manual versions; user-renamed labels survive. Drafts skipped; releases with neither tag nor name counted as `skipped`. Sequential (awaited find+write per release), so large repos are not bulk-written; `maxPages=5` caps at ~500 releases.
- **Public page** makes no distinction between 404 and network error (intentional); relies on the endpoint to gate content.

## Related docs
- [`docs/files/client/components/products/ReleasePublish.md`](../files/client/components/products/ReleasePublish.md), [`docs/files/client/pages/PublicChangelog.md`](../files/client/pages/PublicChangelog.md)
- [`docs/files/client/services/release.md`](../files/client/services/release.md), [`services/github.md`](../files/client/services/github.md)
- [`docs/files/server/controllers/ReleaseController.md`](../files/server/controllers/ReleaseController.md), [`services/ReleaseService.md`](../files/server/services/ReleaseService.md), [`utils/releaseFormat.md`](../files/server/utils/releaseFormat.md)
- [`docs/files/server/controllers/GitHubController.md`](../files/server/controllers/GitHubController.md), [`services/GitHubService.md`](../files/server/services/GitHubService.md), [`utils/github.md`](../files/server/utils/github.md), [`routes/githubRoutes.md`](../files/server/routes/githubRoutes.md), [`schemas/github.schema.md`](../files/server/schemas/github.schema.md)
- [`docs/api/server-api-endpoints.md`](../api/server-api-endpoints.md) (§3 Products/release, §11 GitHub, §17 Public), [`docs/api/client-endpoint-map.md`](../api/client-endpoint-map.md)
- Cross-feature: [`product-management.md`](product-management.md), [`wporg-import.md`](wporg-import.md); AI changelog generator and Version CRUD are separate features.
