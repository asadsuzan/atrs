# `client/src/services/ai.ts`
**Purpose:** AI-assisted content suggestions (titles and descriptions) for entities, grounded in form context.
**Language / Size:** TS / 725 bytes

## Exports (functions)
`suggestTitles`, `suggestDescription`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api`.

## Functions
- **`suggestTitles(entity: string, context: Record<string, any>): Promise<string[]>`** — `POST /api/ai/suggest`; body `{ task: 'title', entity, context }`; returns `data?.titles || []` (3–5 title options).
- **`suggestDescription(entity: string, context: Record<string, any>, title?: string): Promise<string>`** — `POST /api/ai/suggest`; body `{ task: 'description', entity, context, title }`; returns `data?.description || ''`.

## Error handling
No explicit try/catch. Defensive fallbacks (`|| []`, `|| ''`) guard missing response fields but do not catch rejections.

## Relationships
- Consumed by entity create/edit forms offering AI suggestion buttons (products, activities, etc.).
- Backend target: `/api/ai/suggest`.
