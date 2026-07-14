# `server/src/controllers/AiController.ts`
**Purpose:** Single shared AI-assist endpoint that returns suggested titles or descriptions for a form.
**Language / Size:** TypeScript / 944 bytes
## Exports
Named export: `suggest`.
## Imports (Internal / External)
- Internal: `../services/ai/AiService` (`suggestTitles`, `suggestDescription`).
- External: `express` (`Request`, `Response`).
## Handlers / Functions
- **suggest(req,res)** — POST /api/ai/suggest. Reads `req.body`: `task`, `entity`, `context` (default `{}`), `title`. Validation at route via `aiSuggestSchema`. If `task === 'title'`, calls `suggestTitles(entity, context)` → `200 {titles}`; otherwise calls `suggestDescription(entity, context, title)` → `200 {description}`. Errors caught locally → `502 {message: err.message || 'AI request failed'}` (no `next`).
## Important logic & design patterns
- Provider/model failures surface as `502` with an actionable message (so UI can toast) instead of generic `500`.
- Task-based branching (title vs description) over one endpoint.
## Relationships
- Routed by `aiRoutes.ts` (mounted `/api/ai`, behind `requireAuth`+`requireActive`).
- Delegates to `AiService`.
