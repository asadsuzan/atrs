# Directory Guides — Index

> Per-directory orientation for the ATRS monorepo. Each guide describes a
> directory's role, what lives there, its key files (linked to the per-file docs
> under [`../files/`](../files/)), and its conventions. For the big picture start
> with [`../architecture/overview.md`](../architecture/overview.md).

## Client (`client/src`)

- [client-src.md](client-src.md) — overview of the SPA: components, contexts,
  hooks, lib, pages, services, data, types; the provider stack and router.
- [client-components.md](client-components.md) — component taxonomy: the `ui/`
  primitive kit vs. domain feature folders.
- [client-services.md](client-services.md) — the 22 API-client modules and the
  shared `api.ts` axios client.

## Server (`server/src`)

- [server-src.md](server-src.md) — layout: app/index, config, controllers,
  services, repositories, models, schemas, middlewares, routes, utils, scripts,
  types; the API surface.
- [server-layers.md](server-layers.md) — the controller → service → repository →
  model layering and where validation, ownership, and audit live.

## Tools & root

- [tools-dist-builder.md](tools-dist-builder.md) — the standalone free/pro
  distribution builder (`@atrs/dist-builder`).
- [project-root.md](project-root.md) — monorepo root: workspaces, the `api/`
  serverless entry, `vercel.json`, and config files.

## Related material

- [Glossary](../glossary/glossary.md) — domain + technical terms.
- [Appendix](../appendix/index.md) — [tech stack](../appendix/tech-stack.md) and
  [conventions](../appendix/conventions.md).
