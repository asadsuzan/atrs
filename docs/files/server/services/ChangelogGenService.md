# `server/src/services/ChangelogGenService.ts`
**Purpose:** AI changelog generation pipeline — reads git diffs, chunks them, summarizes each via Ollama, synthesizes 4 report formats, and drafts review-queue entries.
**Language / Size:** TypeScript / 32904 bytes

## Exports
- `type RangeType` = `'tags' | 'commit' | 'date' | 'working'`.
- `interface GenerateInput` — pipeline input (repoPath, rangeType, from?, to?, model?, productId?, ownerId?, createReviewEntries?).
- `interface GenerationResult` — `{ stats: {filesAnalyzed, chunksProcessed, commits, model, reviewEntriesCreated}, outputs: {developerChangelog, userReleaseNotes, githubReleaseNotes, qaChecklist} }`.
- `async function runPipeline(input, ctx): Promise<GenerationResult>` — the public orchestrator.

## Imports (Internal / External)
Internal:
- `../utils/sseStream` (type `StreamJobContext` — provides `emit()` and `isCancelled()`)
- `../utils/ollama` (getOllamaUrl, getOllamaHeaders, getModel, ollamaErrorMessage, DETERMINISTIC_OPTIONS, KEEP_ALIVE)
- `../models/Activity` (Activity model for review-queue drafts)

External: Node `child_process.execFile` (promisified) → `git` CLI; `util.promisify`; `path`; global `fetch` → Ollama `/api/generate`.

## Functions / Methods
- **classifyFile(filePath): string** — categorises a path (test/docs/style/config/build/frontend/backend/source/other) by extension + path regex.
- **isNoise(filePath): boolean** — true for lockfiles, .map/.min/.lock, node_modules/, .git/ — excluded from analysis.
- **gitAnalyze(repoPath, rangeType, from?, to?, ctx?)** — Stage 1. Runs `git` via execFileP (cwd=repoPath, 30s timeout, 8MB buffer). Builds range/diffArgs/logArgs per rangeType. `--end-of-options` guards revision args from being read as flags. For `date` it first resolves bounding commits (`git log --reverse --format=%H`) into a range. Gets commit list (`git log --oneline`) and changed files (`git diff --name-status`), parses A/M/D/R/C statuses, skips noise, fetches per-file diffs (`git diff ... -- path`, 2MB buffer). Returns `{files, commitMessages, commitCount, range}`. Throws `Git diff failed:` on diff failure; empty date-range returns empty result. Emits `git` progress.
- **buildChunks(files, ctx?): Chunk[]** — Stage 2. Each file with no diff → single "(no diff)" chunk. Diff ≤ MAX_CHUNK_CHARS (3500) → one chunk. Larger → split on hunk headers (`@@ ... @@`), greedily pack sub-chunks under the cap, each sliced to the cap. Emits `classify` progress with per-category counts.
- **summarizeChunk(chunk, model): Promise<ChunkSummary>** — Stage 3 per-chunk. Builds a prompt asking for JSON {title,type,summary,impact,breakingChange}. POST Ollama `/api/generate` (stream:false, format:'json', keep_alive, DETERMINISTIC_OPTIONS + num_predict 200). On !ok throws `ollamaErrorMessage`. `JSON.parse(data.response)`; normalizes/clamps fields (title trimmed, trailing period stripped, ≤120 chars; type whitelisted else 'improvement'; summary/impact ≤400; breakingChange boolean).
- **summarizeAll(chunks, model, ctx?): Promise<ChunkSummary[]>** — loops chunks; checks `ctx.isCancelled()` each iteration (breaks with warn); emits per-chunk progress with itemIndex/totalItems/label; catches per-chunk errors (emits error, continues). Returns collected summaries.
- **generateReport(summaries, commitMessages, model, format, ctx?): Promise<string>** — Stage 4. Picks system prompt from REPORT_PROMPTS[format]; renders summaries into markdown bullet text; appends up to 100 commit messages; POST Ollama (stream:false, num_predict 2000). Returns trimmed `data.response`. Throws on !ok.
- **generateAllReports(summaries, commitMessages, model, ctx?)** — loops the 4 formats; cancellation-aware; per-format error → output set to a `> ⚠️ Generation failed:` placeholder. Returns the outputs object.
- **normalizeType(t): ReviewEntry['type']** — whitelist or 'improvement'.
- **slugify(s): string** — lowercase, non-alnum→'-', trim dashes, ≤60 chars, fallback 'change'.
- **getCommits(repoPath, range, ctx?)** — `git log --format=%H\x1f%s\x1f%b\x1e range`; splits on record/unit separators into {hash,subject,body}; caps at MAX_COMMITS (100, newest first) with a warn. Returns [] on git failure.
- **summarizeCommit(commit, repoPath, model): Promise<ReviewEntry>** — `git show <hash> --format=` for the diff (20s, 4MB, sliced to MAX_COMMIT_DIFF_CHARS 6000); prompt using subject+body+diff; POST Ollama (format json, num_predict 220). On ANY error falls back to `parsed={}` so the commit subject still yields an entry. key = `commit|<hash>`.
- **summarizeCommits(repoPath, range, model, ctx?)** — getCommits then summarizeCommit per commit (cancellation-aware), emitting `review` progress. Returns entries.
- **synthesizeLogicalEntries(summaries, model, ctx?)** — working-tree fallback: single Ollama call that clusters file-level summaries into logical entries (JSON {entries:[...]}, num_predict 1500). Dedupes slugs; key = `logical|<slug>`. Returns [] on error (emits error).
- **persistReviewEntries(entries, productId, ownerId, ctx?): Promise<number>** — for each entry builds shortDescription (summary/title + Impact + breaking-change note) and `importSourceKey = ai-gen|<productId>|<entry.key>`; `Activity.findOneAndUpdate({importSourceKey, needsReview:true}, {...}, {upsert:true, new:true, setDefaultsOnInsert:true})` — refreshes still-pending drafts, sets on insert tags ['unreleased','ai-generated'], reviewReason 'ai-generated'. Confirmed entries (needsReview:false) untouched. Counts and emits.
- **runPipeline(input, ctx): Promise<GenerationResult>** — see Important algorithms.

## Data structures / Types / Constants
- `MAX_CHUNK_CHARS = 3500`, `MAX_COMMITS = 100`, `MAX_COMMIT_DIFF_CHARS = 6000`.
- `CODE_EXTENSIONS` set (~30 exts).
- `interface ChangedFile {status, path, diff, category}`, `interface Chunk {file, category, diff, index, total}`, `interface ChunkSummary {file, category, title, type, summary, impact, breakingChange}`, `interface ReviewEntry {key, title, type, summary, impact, breakingChange}`.
- `REPORT_PROMPTS` — 4 system prompts: developerChangelog, userReleaseNotes, githubReleaseNotes, qaChecklist (each with distinct formatting rules).

## Important algorithms

### Changelog generation pipeline — `runPipeline`
1. Resolve model: `input.model?.trim() || getModel()`.
2. Stage 1 `gitAnalyze` → files/commitMessages/commitCount/range. If no files, emit warn and return an empty GenerationResult (all outputs "> No changes found…").
3. Stage 2 `buildChunks(files)` → per-file (and per-hunk-split) chunks.
4. Stage 3 `summarizeAll(chunks, model)` → one Ollama JSON call per chunk (deterministic options, num_predict 200). If zero summaries, throw "No chunks could be summarised — check Ollama connectivity".
5. Stage 4 `generateAllReports(summaries, commitMessages, model)` → 4 sequential Ollama calls, one per report format (num_predict 2000), each with a format-specific system prompt.
6. Stage 5 review-queue drafts (only if `createReviewEntries !== false` AND productId AND ownerId): if commit-based (rangeType !== 'working' and range set) → `summarizeCommits` (one entry per commit). If that yields none (or working tree) → `synthesizeLogicalEntries` (single grouping pass). Then `persistReviewEntries` upserts drafts into Activity as needsReview.
7. Return stats {filesAnalyzed, chunksProcessed, commits, model, reviewEntriesCreated} + outputs.

### Ollama call pattern (all stages)
POST `${getOllamaUrl()}/api/generate` with `getOllamaHeaders()`, body `{model, prompt, stream:false, [format:'json'], keep_alive:KEEP_ALIVE, options:{...DETERMINISTIC_OPTIONS, num_predict:N}}`. Note: `stream:false` — the code does NOT stream tokens; SSE progress comes from the pipeline's per-item `ctx.emit`, not from token streaming. Errors: !ok → `ollamaErrorMessage(status, body, model)`; JSON stages `JSON.parse(data.response)`.

## Relationships
- Called by: the changelog-generation controller/route that supplies a `StreamJobContext` (SSE) — cancellation via `ctx.isCancelled()`.
- Models: Activity (review-queue drafts).
- Utils: sseStream (StreamJobContext), ollama (config/headers/options/error helper).
- External: local `git` binary (execFile) and Ollama server `/api/generate`.

## Edge cases & known limitations
- Requires `git` on PATH and a valid repo at `repoPath`; large diffs are truncated (maxBuffer + per-chunk/per-commit char caps).
- Per-chunk failures are tolerated (skipped); only zero total summaries aborts the run.
- Report generation failures per-format degrade to an inline placeholder rather than failing the pipeline.
- summarizeCommit swallows Ollama/parse errors and falls back to the commit subject.
- Uses `stream:false` for every Ollama call despite the "streaming" SSE framing — progress is item-level, not token-level.
- Review drafts deduped/refreshed by `importSourceKey`; user-confirmed entries (needsReview:false) never overwritten.
