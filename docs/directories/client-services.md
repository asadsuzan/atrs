# Directory Guide — `client/src/services`

> The client's API layer: **22 files** — 21 domain service modules plus the
> shared [`api.ts`](../files/client/services/api.md) HTTP client they all build
> on. One module per backend resource; each exports typed functions that call
> the Express API and return `response.data`. Docs:
> [`../files/client/services/`](../files/client/services/).

## The shared client — `api.ts`

[`api.ts`](../files/client/services/api.md) creates the single axios instance
used app-wide: `axios.create({ baseURL: '/api', timeout: 30000 })`. It owns:

- **Token helpers** — `getToken`/`setToken`/`clearToken` over
  `localStorage['atrs_token']`.
- **Request interceptor** — injects `Authorization: Bearer <token>` when present.
- **Response interceptor** — on any `401`, clears the token and full-page
  redirects to `/login` (unless already there); re-throws so callers still see
  the error.
- **`uploadFile(file)`** — multipart `POST /api/upload`, returns the stored URL.

Every domain service imports `{ api }`. The raw-`fetch`/`EventSource` services
(SSE) additionally import `getToken` to set the bearer header manually (or pass
`?token=` for `EventSource`, which can't set headers).

## Domain service modules (21)

| Module | Backend resource | Responsibility |
|---|---|---|
| [`activities`](../files/client/services/activities.md) | `/api/activities` | Changelog-entry CRUD, `bulkUpdateActivities`, bulk-delete stream |
| [`versions`](../files/client/services/versions.md) | `/api/versions` | Version CRUD; feeds `useVersions` / `lib/versions` |
| [`products`](../files/client/services/products.md) | `/api/products` | Product CRUD, WP.org import stream, stale/product lists |
| [`release`](../files/client/services/release.md) | `/api/products/.../release` | Release preview/publish for a product |
| [`issues`](../files/client/services/issues.md) | `/api/issues` | Issue CRUD, `getAllIssues` |
| [`featureRequests`](../files/client/services/featureRequests.md) | `/api/feature-requests` | Platform feature-request CRUD + admin triage |
| [`marketing`](../files/client/services/marketing.md) | `/api/products/.../marketing` | Marketing Hub content (1-to-1 per product) |
| [`media`](../files/client/services/media.md) | `/api/media`, `/api/upload` | Media list/delete, bulk delete, orphan purge stream |
| [`reports`](../files/client/services/reports.md) | `/api/reports` | Monthly report, trend data for Dashboard/Reports |
| [`streak`](../files/client/services/streak.md) | `/api/streak` | Daily-log streak read/write (StreakCard) |
| [`auth`](../files/client/services/auth.md) | `/api/auth` | Login/register/forgot/set-password, `updateMe`, token rotation |
| [`users`](../files/client/services/users.md) | `/api/users` (admin) | User admin CRUD |
| [`auditLogs`](../files/client/services/auditLogs.md) | `/api/audit-logs` | Audit-log queries (scoped) |
| [`config`](../files/client/services/config.md) | `/api/config` (admin) | App config get/update, storage-connection test |
| [`github`](../files/client/services/github.md) | `/api/github` | GitHub PAT validation, release sync |
| [`ai`](../files/client/services/ai.md) | `/api/ai` | Suggest-title / generate-description completions (Ollama) |
| [`changelogGen`](../files/client/services/changelogGen.md) | `/api/changelog-gen` | Changelog Generator: tags/models + streaming pipeline |
| [`jobStream`](../files/client/services/jobStream.md) | `/api/jobs` + SSE | Generic SSE job runner + cancel (used by mini-players) |
| [`notifications`](../files/client/services/notifications.md) | `/api/notifications` | Notification list/read + SSE `subscribe` |
| [`export`](../files/client/services/export.md) | `/api/export` (admin) | Full DB export download |
| [`public`](../files/client/services/public.md) | `/api/public` | Hosted public changelog/issues + `/explore` directory (no auth) |

## Conventions

- **One module per resource**, mirroring the server route mounts in
  `server/src/routes/*` (see [server-src.md](server-src.md)).
- **Thin wrappers**: functions call `api.<method>` and return `response.data`;
  error handling is centralized in the axios interceptors.
- **SSE/streaming** (`changelogGen`, `jobStream`, `products` import, `media`
  purge) uses raw `fetch` streams or `EventSource`, pulling the JWT from
  `getToken()` and passing `?token=` for `EventSource`. These pair with the
  `jobs/` mini-player components and their contexts.
- **React Query** keys are defined by the calling page/hook, not the service —
  services stay stateless.
