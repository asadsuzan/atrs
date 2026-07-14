# `server/src/services/ai/AiService.ts`
**Purpose:** Shared AI-assist service powering every form's "Suggest title / Generate description" actions; issues a single JSON completion against the configured Ollama endpoint and normalizes the result.
**Language / Size:** TypeScript / 2396 bytes

## Exports
- `async function suggestTitles(entity, context): Promise<string[]>` — 3–5 cleaned title options.
- `async function suggestDescription(entity, context, title?): Promise<string>` — one description paragraph (≤2000 chars).
- (`complete()` is module-private, not exported.)

## Imports (Internal / External)
Internal:
- `../../utils/ollama` (getOllamaUrl, getOllamaHeaders, getModel, KEEP_ALIVE, ollamaErrorMessage)
- `./prompts` (titlePrompt, descriptionPrompt)

External: global `fetch` (Ollama HTTP API). No DB.

## Functions / Methods
- **complete(prompt, opts{numPredict, temperature}): Promise<any>** (private) — POSTs to `${getOllamaUrl()}/api/generate` with headers `getOllamaHeaders()` and body `{ model: getModel(), prompt, stream:false, format:'json', keep_alive: KEEP_ALIVE, options:{ temperature, top_p:0.9, num_predict: numPredict } }`. On non-OK response reads body text and throws `new Error(ollamaErrorMessage(status, body, model))`. On OK, `JSON.parse(data.response)`; if that parse throws, throws `Error('The AI returned an unexpected response — try again.')`.
- **suggestTitles(entity, context): Promise<string[]>** — `complete(titlePrompt(entity, context), {numPredict:220, temperature:0.6})`; takes `parsed.titles` if array; each title: `String`, trim, strip surrounding quotes (`/^["']|["']$/g`), strip trailing period (`/\.$/`), drop falsy, `slice(0,5)`.
- **suggestDescription(entity, context, title?): Promise<string>** — `complete(descriptionPrompt(entity, context, title), {numPredict:400, temperature:0.4})`; returns `String(parsed.description || '').trim().slice(0, 2000)`.

## Data structures / Types / Constants
- Sampling parameters are inline: titles temperature 0.6 / num_predict 220; descriptions temperature 0.4 / num_predict 400; shared `top_p 0.9`. `format:'json'` and `stream:false` force a single JSON blob response.

## Important algorithms
- **JSON-mode completion:** requests Ollama's `format:'json'`, then parses `data.response` as JSON, so the model must return the documented shape (`{titles:[]}` / `{description:''}`); a parse failure is converted to a friendly user-facing error.
- **Output sanitation (titles):** normalizes model quirks — quotes, trailing periods, blanks — and caps to 5.
- **Non-determinism by design:** slight temperature and no fixed seed so repeated "Suggest" clicks yield fresh options.

## Relationships
- Consumers: AI-assist controller/routes backing form "Suggest title" / "Generate description" buttons across entities.
- Uses `../../utils/ollama` for endpoint/model/headers/keep-alive and error formatting; prompt text from `./prompts`.
- Provider-agnostic wrapper: an OpenAI/Gemini backend could replace `complete()` without changing callers.

## Edge cases & known limitations
- Hard-coupled to Ollama today despite the provider-agnostic intent.
- No streaming; a single blocking request per call.
- Malformed model output (non-JSON or wrong shape) surfaces as a thrown error or an empty/normalized result (missing `titles` → `[]`, missing `description` → `''`).
- Description output is truncated to 2000 chars; titles limited to 5 and ~12 words per the prompt (not enforced in code).
