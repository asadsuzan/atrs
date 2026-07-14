# ATRS — Documentation

**ATRS = Automated Townhall Report System** (`atrs-monorepo` v1.0.0) — a
multi-tenant platform for tracking software products, their changelogs and
versions, WordPress.org imports, AI-assisted release notes, marketing content,
media, issues, and reporting.

This `docs/` tree is a reverse-engineered knowledge base: **every source file has
a mirrored reference doc**, and higher-level synthesis docs explain how the
pieces fit together. Every claim is traceable to a cited source file.

> **New here?** Start with [Architecture overview](architecture/overview.md),
> then browse [Features](features/index.md). Looking for a specific file? See
> [Per-file reference](#per-file-reference). Looking for an endpoint? See the
> [Server API reference](api/server-api-endpoints.md).

---

## Map of the knowledge base

### 1. Orientation
- [Architecture overview](architecture/overview.md) — monorepo layout,
  deployment modes (local Express vs Vercel serverless), request lifecycle,
  auth model, storage, external integrations, boot sequence.
- [Data-flow traces](architecture/data-flow.md) — CRUD, SSE streaming jobs,
  notifications, and React Query flows, step by step.
- [Frontend architecture](architecture/frontend.md) — provider nesting,
  routing, code-splitting, global streaming surfaces, versioning single-source.
- [Knowledge base spine](inventory/KNOWLEDGE-BASE.md) — grounded architecture
  facts + the build/status log this tree was generated from.

### 2. Features (end-to-end)
[Feature index](features/index.md) — each ties client + server together:
- [Product management](features/product-management.md) ·
  [WordPress.org import](features/wporg-import.md) ·
  [Marketing hub](features/marketing-hub.md)
- [Changelog management](features/changelog-management.md) ·
  [Version management](features/version-management.md) ·
  [Changelog generator](features/changelog-generator.md) ·
  [Releases](features/releases.md)
- [Issues & feature requests](features/issues-and-feature-requests.md) ·
  [Streak tracking](features/streak-tracking.md) ·
  [Reports & dashboard](features/dashboard-and-insights.md)
- [Media library](features/media-library.md) ·
  [Image framer](features/image-framer.md)
- [AI assist](features/ai-assist.md) ·
  [Notifications](features/notifications.md) ·
  [Auth & users](features/auth-and-users.md)

### 3. Algorithms
[Algorithms index](algorithms/index.md) — the non-trivial logic:
WP.org import pipeline, SVN metadata fetch, readme changelog parsing, slug
disambiguation, streak calculation, metrics aggregation, release assembly/export,
AI generation, image-framer compositing, accent-color extraction, WP stats
aggregation, and boot-time seed/migrate.

### 4. Reference
- [Server API endpoints](api/server-api-endpoints.md) — the authoritative REST
  reference (guards, schemas, responses, SSE, rate limits).
- [Client endpoint map](api/client-endpoint-map.md) — which client services call
  which endpoints.
- [Database schema](database/schema.md) — collections, fields, indexes,
  relationships.
- [Environment variables](configuration/environment-variables.md) — all env
  vars and app-config keys.
- [Glossary](glossary/glossary.md) — domain + technical terms.

### 5. Codebase guides
[Directory guides index](directories/index.md):
- [Project root](directories/project-root.md) — workspaces, serverless entry,
  vercel.json, config files.
- [`client/src`](directories/client-src.md) ·
  [client components](directories/client-components.md) ·
  [client services](directories/client-services.md)
- [`server/src`](directories/server-src.md) ·
  [server layering](directories/server-layers.md)
- [tools/dist-builder](directories/tools-dist-builder.md)

### 6. Appendix
[Appendix index](appendix/index.md) —
[tech stack](appendix/tech-stack.md) · [conventions](appendix/conventions.md).

---

## Per-file reference

`docs/files/**` mirrors the source tree one-to-one (**305 file docs**). Each doc
covers purpose, exports, imports, functions/methods, types, algorithms,
relationships, and edge cases.

| Area | Path | Docs |
|---|---|---|
| Client (`client/src`) | [`files/client/`](files/client/) | 143 |
| Server (`server/src`) | [`files/server/`](files/server/) | 122 |
| Repo root config | [`files/root/`](files/root/) | 24 |
| `tools/dist-builder` | [`files/tools/`](files/tools/) | 16 |

Common entry points:
- Server: [`app.ts`](files/server/app.md), [`index.ts`](files/server/index.md),
  [auth middleware](files/server/middlewares/auth.md),
  [ProductService](files/server/services/ProductService.md).
- Client: [`main.tsx`](files/client/main.md), [`App.tsx`](files/client/App.md),
  [axios client](files/client/services/api.md),
  [Dashboard](files/client/pages/Dashboard.md).

---

## Conventions in this documentation
- **Source-traceable:** claims cite the file (and often function/line) they come
  from; nothing is invented.
- **Status legend** in the [knowledge base](inventory/KNOWLEDGE-BASE.md) tracks
  per-area completion.
- **Filename note:** a repo hook blocks writing files whose path contains
  "report"/"summary"/"findings"/"analysis"; a few docs are named around this
  (e.g. [`algorithms/metrics-aggregation.md`](algorithms/metrics-aggregation.md),
  [`features/dashboard-and-insights.md`](features/dashboard-and-insights.md)).

_Totals: 354 Markdown docs — 305 per-file + 49 synthesis/reference._
