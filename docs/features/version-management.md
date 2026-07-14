# Version Management

**Summary:** Product versions (release rows — manual or GitHub-synced) are managed through a CRUD table per product, and their ordering plus "Latest"/"Unreleased" status is derived by a **single client-side source of truth** (`lib/versions` + `useVersions` + `VersionBadge`) that every consumer reads rather than re-deriving from activity/changelog labels.

## User-facing entry points
- The `VersionManager` component (`client/src/components/versions/VersionManager.tsx`) — the versions table for a product, rendered inside the Product Details "Versions" area.
- Deep-link filter: `?versionStatus=released|unreleased` seeds the manager's status filter.
- "Add Version" / edit dialog (label, status, release date, author, notes).
- "Sync from GitHub" button (shown when the product's `githubUrl` contains `github.com`) — pulls GitHub Releases into versions. See cross-links to the GitHub-sync per-file docs below.
- `VersionBadge` is the shared visual entry point wherever a version's state appears: version tables, the version `<Select>` options in `ActivityForm`, changelog/release views.

## Client pieces
- **Component:** `client/src/components/versions/VersionManager.tsx` — search (label/author/plain-text notes) + status `Select`, client-side pagination over the decorated list, add/edit dialog, delete (confirm-gated), and `syncMutation` → `syncProductReleases(productId)`. Author cell maps WP.org contributor usernames → avatars (`AuthorAvatar`). It relies on `useProductVersions` for ordering and the `isLatest` flag rather than re-deriving.
- **Shared badge:** `client/src/components/versions/VersionBadge.tsx` — the single component rendering `latest` (green + ring) / `unreleased` (amber + dot) / `released` (green). Presentational only; the caller supplies `kind` (typically from decoration).
- **Single source of truth (the core principle):**
  - `client/src/lib/versions.ts` — normalizes the varied API shapes, orders canonically, and computes flags. `decorateVersions(raw)` sets `isUnreleased` and marks exactly one `isLatest` (the first non-unreleased entry after sort). `compareVersionDesc` is numeric-aware (`1.10` after `1.9`, leading `v` stripped). Also: `latestReleasedLabel`, `groupVersionsByProduct`, `summarizeLabels` (union of status per label across products, for label-keyed filters like Reports).
  - `client/src/hooks/useVersions.ts` — `useProductVersions(productId)` (`useQuery ['versions', productId]`, `enabled:!!productId`, → `decorateVersions`) and `useAllVersions()` (`useQuery ['allVersions']` → `raw` + `byProduct` + `labelInfo`). Consumers read ordering/flags from here.
  - **Do NOT re-derive versions from activity/changelog labels.** `lib/versions` + `useVersions` + `VersionBadge` are the authoritative version list/badge source app-wide (per project memory: "Versioning single source"). Changelog entries reference a version via `versionId`; they do not define the version list.
- **Service:** `client/src/services/versions.ts` — `getVersions(productId)`, `getAllVersions()`, `createVersion`, `updateVersion({id,...})`, `deleteVersion(id)` via shared axios `api`.
- **React Query keys:** `['versions', productId]` (per-product; VersionManager mutations invalidate this exact key so `useProductVersions` refreshes), `['allVersions']` (owner-wide). Cache-key alignment between the hook and the manager's mutations is deliberate.
- **Context consumed:** `ConfirmContext` (delete confirmation). Sound via `@/lib/sound`.

## Server pieces
Router `server/src/routes/versionRoutes.ts` mounted at `/api/versions` behind `requireAuth` + `requireActive`. Standard REST CRUD → `VersionController` (`server/src/controllers/VersionController.ts`) → `VersionService` (`server/src/services/VersionService.ts`) → `Version` model.

| Method + Path | Validation | Controller | Notes |
|---|---|---|---|
| `POST /` | `createVersionSchema` | `createVersion` | 201; owner inherited from product |
| `GET /` | — (query `productId` opt) | `getVersions` | all owner products if no `productId` (product populated) |
| `GET /:id` | `idParamSchema` | `getVersionById` | 404 if not owned/found |
| `PATCH /:id` | `updateVersionSchema` | `updateVersion` | strips `ownerId`+`productId` (no re-parent) |
| `DELETE /:id` | `idParamSchema` | `deleteVersion` | `{message}` |

**Auth guards:** mount-level `requireAuth` + `requireActive`; ownership enforced in `VersionService` via `scopeFilter`/`assertOwner` (non-owners get 404 semantics).

**Key service behaviors:**
- **Ownership inheritance:** `createVersion` loads the parent `Product`, `assertOwner`s, sets `ownerId` from `product.ownerId`.
- **Re-parenting blocked:** `updateVersion` deletes both `ownerId` and `productId` from the payload — a version cannot be moved between products (ReleaseService trusts `productId`).
- **List order:** `getVersions` sorts `{releasedAt:-1, createdAt:-1}`; when no `productId`, populates `productId` (name/slug/icon) for dashboard grouping. No pagination server-side (client paginates).
- **Audit logging:** all mutations logged via `AuditLogService`.
- **GitHub sync writes here too:** `POST /api/github/products/:id/sync-releases` (GitHubController → GitHubService) writes GitHub Releases into the `versions` collection with `source:'github'`, idempotent on `externalId`. This is the same collection VersionManager reads, so synced releases appear in the manager and are decorated identically.

## Data model
`Version` model (`server/src/models/Version.ts`), collection `versions`:
- `ownerId`→User (inherited), `productId`→Product (required, indexed), `label` (required), `notes` (default `''`), `status` (enum released/unreleased, default `released`), `releasedAt` (Date), `author` (default `''`).
- Sync fields: `source` (manual/github, default manual), `externalId` (GitHub release/tag id — for idempotent sync), `externalUrl` (upstream release page).
- Unique compound index `{productId, source, externalId}` (partial: only when `externalId` is a non-empty string) → idempotent GitHub sync; manual versions (empty `externalId`) are exempt.
- `createdAt`/`updatedAt` via timestamps.

Note: activities carry `versionId`→Version; deleting a version does **not** cascade-clean referencing activities (dangling `versionId` handled elsewhere).

## Notable behaviors & edge cases
- **Exactly one `isLatest`:** `decorateVersions` sorts unreleased-first then descending label, and flags the first released entry as latest; if all versions are unreleased, none is latest.
- **Ordering is by label string (numeric-aware), not by `releasedAt`** on the client — a mis-labeled version sorts by its label, which can diverge from the server's `releasedAt`-based list sort.
- **`status` compared strictly to `'unreleased'`** in `lib/versions`; any other value (including unknown strings) is treated as released.
- **`summarizeLabels` unions status across products:** a label is considered unreleased if *any* version bearing it is unreleased — used for cross-product, label-keyed filters that lack per-product version objects.
- **Add/edit dialog:** an unreleased version submits `releasedAt:null` (clears any date); a released version submits the chosen date or `undefined`.
- **GitHub sync** requires a parseable `github.com` URL and server support; errors surface `err.response.data.message`.
- Filtering and pagination in `VersionManager` are entirely client-side over the full decorated list.

## Related docs
- Client: [../files/client/components/versions/VersionManager.md](../files/client/components/versions/VersionManager.md), [../files/client/components/versions/VersionBadge.md](../files/client/components/versions/VersionBadge.md), [../files/client/hooks/useVersions.md](../files/client/hooks/useVersions.md), [../files/client/lib/versions.md](../files/client/lib/versions.md), [../files/client/services/versions.md](../files/client/services/versions.md)
- Server: [../files/server/routes/versionRoutes.md](../files/server/routes/versionRoutes.md), [../files/server/controllers/VersionController.md](../files/server/controllers/VersionController.md), [../files/server/services/VersionService.md](../files/server/services/VersionService.md), [../files/server/models/Version.md](../files/server/models/Version.md), [../files/server/schemas/version.schema.md](../files/server/schemas/version.schema.md)
- GitHub release sync (writes Versions): [../files/server/routes/githubRoutes.md](../files/server/routes/githubRoutes.md), [../files/server/controllers/GitHubController.md](../files/server/controllers/GitHubController.md), [../files/server/services/GitHubService.md](../files/server/services/GitHubService.md), [../files/server/utils/releaseFormat.md](../files/server/utils/releaseFormat.md)
- API: [../api/server-api-endpoints.md](../api/server-api-endpoints.md) (§5 Versions, §11 GitHub), [../api/client-endpoint-map.md](../api/client-endpoint-map.md)
- Related features: [changelog-management.md](changelog-management.md), [changelog-generator.md](changelog-generator.md)
