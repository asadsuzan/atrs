# AI Generation (Ollama) — Title / Description Suggestions

**Source:** `server/src/services/ai/AiService.ts` +
`server/src/services/ai/prompts.ts`, with transport helpers in
`server/src/utils/ollama.ts`. Consumer: `AiController` (`POST /api/ai/suggest`),
surfaced by `client/src/components/ai/AiAssist.tsx`. (The Changelog Generator
uses the same Ollama transport for its multi-step pipeline — see
`docs/features/changelog-generator.md`.)

## Purpose
Generate a suggested changelog-entry title or a longer description from the
form's current context, using a locally- or cloud-hosted Ollama model, with
guardrails on the output.

## Algorithm
1. **Resolve transport & model** (`utils/ollama.ts`): URL, headers, model, and
   mode (local vs cloud) come from app config
   (`changelogGen.{model, ollamaMode, ollamaCloudUrl, ollamaCloudKey}`); default
   model `qwen2.5-coder`. `DETERMINISTIC_OPTIONS` and a `KEEP_ALIVE` are applied
   for stable output.
2. **Build a grounded prompt** (`prompts.ts`): embed the relevant form context
   (title, type, product, existing text, …) as JSON, **capped at ~4000 chars**,
   and instruct the model to return **JSON only** in a specific shape.
3. **Call Ollama** in **JSON mode** (`/api/generate`, `format: json`) via the
   resolved transport.
4. **Parse & sanitize** the JSON response:
   - **Title:** strip surrounding quotes / trailing period; cap to **5 words**.
   - **Description:** cap to **2000 chars**.
5. **Return** the sanitized suggestion to the controller.

## Design notes
- **JSON mode + JSON-only prompts** make parsing robust (no free-form scraping).
- **Context capping** (4000 chars in, 5 words / 2000 chars out) bounds token
  cost and keeps suggestions on-scale.
- **Deterministic options** reduce run-to-run variance.

## Edge cases & limitations
- Requires a reachable Ollama endpoint (local daemon or configured cloud URL +
  key); connection/errors surface as a mapped error message (`utils/ollama.ts`).
- Output quality depends on the configured model; sanitization guards format,
  not factual accuracy.

## Source references
- `AiService` (suggest-title / generate-description), `prompts.ts`
  (prompt builders), `utils/ollama.ts` (transport, `DETERMINISTIC_OPTIONS`,
  `KEEP_ALIVE`).
