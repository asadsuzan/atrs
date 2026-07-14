# `server/src/utils/ollama.ts`
**Purpose:** Resolves Ollama configuration (base URL, headers, model, mode) from app config with env-var fallbacks, maps Ollama HTTP errors to actionable messages, and provides deterministic sampling constants for reproducible changelog generation.
**Language / Size:** TypeScript / 3724 bytes

## Exports
- `function getOllamaUrl(): string`
- `function getOllamaHeaders(): Record<string, string>`
- `function getModel(): string`
- `function getOllamaMode(): 'local' | 'cloud'`
- `function ollamaErrorMessage(status: number, body: string, model: string): string`
- `const DETERMINISTIC_OPTIONS` (temperature 0, top_p 1, top_k 0, seed 42)
- `const KEEP_ALIVE = '30m'`

## Imports (Internal / External)
- Internal: `readAppConfig` from `./appConfig`; `unsealSecret` from `./crypto`.
- External: none.

## Functions / Methods
### `readConfig()` (private)
Returns `readAppConfig()?.changelogGen || {}`; returns `{}` on any thrown error.

### `getOllamaUrl()`
In `'cloud'` mode uses `cfg.ollamaCloudUrl || OLLAMA_CLOUD_URL` (trimmed). If empty, falls back to `OLLAMA_URL || 'http://localhost:11434'`. Strips trailing slashes and a trailing `/api/generate` (so callers append their own path). Returns the localhost default if the result is empty.

### `getOllamaHeaders()`
Always sets `Content-Type: application/json`. In cloud mode, resolves the API key as `unsealSecret(cfg.ollamaCloudKey)` OR `OLLAMA_CLOUD_KEY` env var (the sealed config value is preferred; env is the fallback / primary on serverless). If a key exists, adds `Authorization: Bearer <key>`.

### `getModel()`
Returns `readConfig().model || 'qwen2.5-coder'`.

### `getOllamaMode()`
Returns `'cloud'` when `readConfig().ollamaMode === 'cloud'`, else `'local'`.

### `ollamaErrorMessage(status, body, model)`
Builds a user-facing message tuned to mode:
- 401/403 → cloud: "add a valid API key"; local: "check the endpoint's authentication".
- 404 or body matching `/not found/i` → cloud: "pick a model it serves"; local: "run: ollama pull <model>".
- otherwise → `Ollama responded <status>` plus up to 200 chars of the trimmed body as detail.

## Data structures / Types / Constants
- `DETERMINISTIC_OPTIONS`: `{ temperature: 0, top_p: 1, top_k: 0, seed: 42 }` (`as const`) — greedy decoding + fixed seed for byte-identical output across local/cloud for the same model/prompt. Spread into each request's `options`, adding per-call `num_predict`.
- `KEEP_ALIVE = '30m'`: keeps the model resident between calls.

## Important algorithms
URL normalization (strip trailing slashes and a pasted `/api/generate`). Deterministic decoding contract ensures reproducible generation regardless of local vs cloud endpoint.

## Relationships
Reads config via `appConfig.ts`; decrypts the stored cloud key via `crypto.ts` (`unsealSecret`). Consumed by the Git changelog generation service that calls the Ollama API.

## Edge cases & known limitations
- Cloud key resolution silently falls back to the env var when the sealed value can't be decrypted (per `unsealSecret` behavior).
- Error-message classification for missing models relies on status 404 or a `not found` substring in the body.
- Only the `changelogGen` config block is consulted.
