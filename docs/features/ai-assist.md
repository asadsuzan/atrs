# AI Assist

**Summary:** Inline "Suggest title / Generate description" helper buttons embedded in ATRS forms, backed by a single `POST /api/ai/suggest` endpoint that issues one JSON-mode completion against a configured Ollama provider (local or cloud) and returns either title options or a description paragraph.

> This is the **inline field-suggestion** feature. The multi-output **AI changelog generator** (git diff → dev changelog / release notes / GitHub notes / QA checklist, streamed over SSE) is a separate feature — see [Changelog generator](changelog-generator.md). The two only share the underlying Ollama provider config (`server/src/utils/ollama.ts`).

## User-facing entry points

- No dedicated route. Two reusable buttons are dropped into entity create/edit forms:
  - **✨ Suggest** (title) — opens a popover of 3–5 title options; picking one fills the field.
  - **✨ Generate** (description) — one click fills a description paragraph.
- Seen in issue forms (`IssueManager`, `QuickIssueDialog`) and other entity forms (products, activities, etc.).

## Client pieces

- Component: `client/src/components/ai/AiAssist.tsx` — exports `SuggestTitleButton({ entity, getContext, onPick, ... })` and `GenerateDescriptionButton({ entity, getContext, getTitle?, onResult, ... })`. Entity-agnostic; `getContext()`/`getTitle()` are evaluated **at click time** so suggestions see the latest form state.
- Service: `client/src/services/ai.ts` — `suggestTitles(entity, context)` → `POST /api/ai/suggest` body `{ task:'title', entity, context }`, returns `data?.titles || []`; `suggestDescription(entity, context, title?)` → body `{ task:'description', entity, context, title }`, returns `data?.description || ''`. Authed axios `api`.
- No React Query keys or contexts — async work runs directly in click handlers with local `loading`/`titles`/`open` state. Errors surface via `toast` (`err?.response?.data?.message` fallback), so the `502` provider-failure path yields an actionable message.

## Server pieces

- Route: `server/src/routes/aiRoutes.ts` — single endpoint `POST /suggest`, mounted at `/api/ai` with `requireAuth` + `requireActive` (from `app.ts`), validated by `aiSuggestSchema`.
- Controller: `server/src/controllers/AiController.ts` (`suggest`) — reads `{ task, entity, context = {}, title }`. `task === 'title'` → `suggestTitles(entity, context)` → `200 { titles }`; otherwise → `suggestDescription(entity, context, title)` → `200 { description }`. Errors are caught locally and returned as **`502 { message }`** (not passed to `next`), so provider/model failures are distinguishable from generic `500`s.
- Service: `server/src/services/ai/AiService.ts` — private `complete(prompt, opts)` POSTs to `${getOllamaUrl()}/api/generate` with `getOllamaHeaders()` and body `{ model: getModel(), prompt, stream:false, format:'json', keep_alive: KEEP_ALIVE, options:{ temperature, top_p:0.9, num_predict } }`. Non-OK response → throws `Error(ollamaErrorMessage(status, body, model))`; unparseable `data.response` → `Error('The AI returned an unexpected response — try again.')`.
  - `suggestTitles`: `num_predict:220`, `temperature:0.6`; takes `parsed.titles` array, normalizes each (String, trim, strip surrounding quotes, strip trailing period, drop falsy), caps to 5.
  - `suggestDescription`: `num_predict:400`, `temperature:0.4`; returns `String(parsed.description || '').trim().slice(0, 2000)`.
- Prompts: `server/src/services/ai/prompts.ts` — `titlePrompt`/`descriptionPrompt` embed the caller's structured `context` as pretty-printed JSON (private `contextBlock`, capped at 4000 chars) with explicit "base strictly on context, do not invent facts" grounding, and demand JSON-only output (`{"titles": string[]}` / `{"description": string}`).
- Provider config: `server/src/utils/ollama.ts` — `getOllamaUrl` (local default `http://localhost:11434`, or cloud URL), `getOllamaHeaders` (adds `Authorization: Bearer <key>` in cloud mode, key from sealed config `unsealSecret(cfg.ollamaCloudKey)` or `OLLAMA_CLOUD_KEY` env), `getModel` (default `qwen2.5-coder`), `getOllamaMode` (`local`/`cloud`), `ollamaErrorMessage` (mode-tuned messages for 401/403 and 404/"not found"), `KEEP_ALIVE = '30m'`. Config is read from the `changelogGen` block of app config.
- Schema: `aiSuggestSchema` (`server/src/schemas/ai.schema.ts`) — `task` enum title/description (req), `entity` string 1–60 (req), `context` record optional, `title` ≤300 optional (used for `task==='description'`).

## Data model

None. AI assist is **stateless** — no collection is read or written. It only reaches out to the Ollama HTTP API and returns the suggestion to the caller; nothing is persisted server-side.

## Notable behaviors & edge cases

- **502 on provider failure:** any Ollama error (unreachable, bad API key, missing model) becomes `502 { message }` with a user-facing string from `ollamaErrorMessage`, so the form can toast something actionable (e.g. "run: ollama pull <model>" locally, or "add a valid API key" in cloud mode).
- **JSON-mode contract:** requests use Ollama `format:'json'` + `stream:false`; the model must return the documented shape. A parse failure becomes a friendly error; a missing/wrong-typed field degrades to `[]` (titles) or `''` (description).
- **Non-deterministic by design:** non-zero temperature (0.6 titles / 0.4 descriptions) and no fixed seed, so repeated "Suggest" clicks yield fresh options. (Contrast: the changelog generator uses `DETERMINISTIC_OPTIONS` for reproducible output.)
- **Grounding + size guard:** context is JSON-embedded verbatim (not paraphrased); serialization is capped at 4000 chars (raw slice, can cut mid-JSON) and non-serializable context silently degrades to `{}`, leaving the model ungrounded.
- **Latest-state capture:** client `getContext`/`getTitle` closures read live form state at click time, not at render.
- **Output caps:** titles ≤5 (and ~12 words per the prompt, not code-enforced); description hard-truncated to 2000 chars.
- **Provider coupling:** wrapper is provider-agnostic in intent, but `complete()` is hard-coupled to Ollama today. Cloud key falls back to the env var if the sealed value can't be decrypted.

## Related docs

- Client: [AiAssist](../files/client/components/ai/AiAssist.md), [ai service](../files/client/services/ai.md)
- Server: [aiRoutes](../files/server/routes/aiRoutes.md), [AiController](../files/server/controllers/AiController.md), [AiService](../files/server/services/ai/AiService.md), [prompts](../files/server/services/ai/prompts.md), [ai.schema](../files/server/schemas/ai.schema.md), [ollama util](../files/server/utils/ollama.md)
- API: [server-api-endpoints](../api/server-api-endpoints.md) §13 · [client-endpoint-map](../api/client-endpoint-map.md)
- Related features: [Changelog generator](changelog-generator.md) (separate multi-output AI pipeline sharing the Ollama provider config)
