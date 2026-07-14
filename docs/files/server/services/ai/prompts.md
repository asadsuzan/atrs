# `server/src/services/ai/prompts.ts`
**Purpose:** Prompt templates for the shared AI assist service; each embeds the caller's structured form context so title/description suggestions are grounded in what the user is actually filling in.
**Language / Size:** TypeScript / 1972 bytes

## Exports
- `function titlePrompt(entity, context): string` — prompt asking for 3–5 title options.
- `function descriptionPrompt(entity, context, title?): string` — prompt asking for one description paragraph.
- (`contextBlock()` is module-private, not exported.)

## Imports (Internal / External)
None. Pure string builders (uses `JSON.stringify`).

## Functions / Methods
- **contextBlock(context): string** (private) — pretty-prints `context ?? {}` via `JSON.stringify(..., null, 2)` inside try/catch (falls back to `'{}'` on failure, e.g. circular refs); if longer than 4000 chars, truncates to first 4000 chars + `\n… (truncated)` so an oversized field can't blow the prompt.
- **titlePrompt(entity, context): string** — joins lines with `\n`: role line for the `entity`; "Base the titles strictly on the structured context… do not invent facts"; rules (3–5 distinct options most-fitting-first; clear/specific, no trailing period, ≤~12 words; no numbering/quotes/surrounding text); `Respond with JSON only: {"titles": string[]}`; then `Context:` + `contextBlock(context)`.
- **descriptionPrompt(entity, context, title?): string** — same structure; includes `The chosen title is: "<title>".` only when `title` is provided; instructs to expand on context without inventing specifics; rules (one short paragraph, 2–4 sentences; plain professional tone; no markdown headings/bullets); `Respond with JSON only: {"description": string}`; `Context:` + `contextBlock(context)`. Uses `.filter(Boolean).join('\n')` to drop the empty title line when absent.

## Data structures / Types / Constants
- Context serialization cap: 4000 characters (then truncated with a marker).
- Both prompts demand JSON-only output matching the shapes consumed by AiService (`{titles}` / `{description}`).

## Important algorithms
- **Grounding:** structured context is JSON-embedded (not paraphrased) with explicit "do not invent" instructions so the model stays anchored to the form fields.
- **Prompt-size guard:** `contextBlock` caps serialized context to keep prompts bounded regardless of field size.

## Relationships
- Consumed by `./AiService.ts` (`suggestTitles` → titlePrompt; `suggestDescription` → descriptionPrompt).
- The requested JSON shapes correspond exactly to what AiService parses/normalizes.

## Edge cases & known limitations
- Context that fails to serialize (e.g. circular structure) silently degrades to `{}`, so the model receives no grounding.
- Truncation is a raw 4000-char slice — it can cut mid-token/mid-JSON, leaving invalid JSON inside the context block (only the outer prompt shape is guaranteed).
- Rules (word counts, formatting) are instructions to the model, not enforced by code.
