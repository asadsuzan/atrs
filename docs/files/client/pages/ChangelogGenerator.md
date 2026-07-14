# `client/src/pages/ChangelogGenerator.tsx`
**Purpose / Route:** Git Changelog Generator — analyze git changes for a product repo and generate developer changelogs, user release notes, GitHub release notes, and QA checklists via an Ollama model. Route `/changelog-generator` (per assignment; not verified in this file).
**Language / Size:** TSX / 26657 bytes

## Exports
- `default function ChangelogGenerator()` — the page component. No named exports.
(Two module-local helper functions `SimpleMarkdown` and `parseInline` are defined but not exported.)

## Imports (Internal / External)
Internal:
- `../components/layout/PageTransition` (default) + named `staggerContainer`, `staggerItem`
- `../services/products` → `getProducts`
- `../services/changelogGen` → `getProductTags`, `getProductModels`, and types `GenerateInput`, `GenerationResult`, `RangeType`
- `../contexts/ChangelogGenContext` → `useChangelogGen`
- UI: button, input, select (Select/SelectContent/SelectItem/SelectTrigger/SelectValue), badge

External:
- `react` → useState, useRef, useCallback, useEffect
- `react-router-dom` → Link
- `@tanstack/react-query` → useQuery
- `framer-motion` → motion, AnimatePresence
- `lucide-react` → GitBranch, Play, Square, Copy, Check, Tag, Calendar, Hash, FileCode2, Layers, ClipboardList, GitPullRequest, Users, Loader2, AlertCircle, Info
- `sonner` → toast

## Component tree & sub-components defined
`ChangelogGenerator` (default). Module-local components:
- `SimpleMarkdown({ content })` — line-by-line markdown renderer (h1–h4, `---` hr, `- [ ]`/`- [x]` checklists, `-`/`*` bullets, `>` blockquotes, empty lines, paragraphs).
- `parseInline(text)` — inline parser for `**bold**` and `` `code` ``.
Constants: `RANGE_OPTIONS` (working/tags/commit/date), `OUTPUT_TABS` (developerChangelog/userReleaseNotes/githubReleaseNotes/qaChecklist), `STEP_LABELS` (git/classify/summarize/report/review).

## State / Refs / Context consumed
Context: `useChangelogGen()` → `{ running, logs, currentStep, progress, result, error, start, cancel }`.
State (useState): `productId` (''), `rangeType` (RangeType, 'working'), `from` (''), `to` (''), `modelOverride` (''), `createReviewEntries` (true), `activeTab` (keyof GenerationResult['outputs'], 'developerChangelog'), `copied` (false).
Ref: `logEndRef` (HTMLDivElement) — scroll anchor for log panel.

## Hooks & Effects (deps, purpose, WHY)
- `useEffect` — deps [logs] → `logEndRef.current?.scrollIntoView({ behavior:'smooth' })`. WHY: auto-scroll the pipeline log panel to newest entry.
- `useCallback` × 3: `handleGenerate` (validates + calls start), `handleCancel` (calls cancel), `handleCopy` (copies active tab output to clipboard, 2s "Copied" state).

## Data fetching (services/endpoints; react-query keys/mutations)
Queries:
- `['products']` → `getProducts()`; filtered to `eligibleProducts = products.filter(p => p.repoPath)`.
- `['product-tags', productId]` → `getProductTags(productId)`, `enabled: !!productId && rangeType === 'tags'` (populates From/To tag selects).
- `['ollama-models']` → `getProductModels` (suggested model chips).
No react-query mutations. The generation pipeline is driven by `useChangelogGen().start(input, { productName })` — see below.

## Event handlers & key functions
- `handleGenerate` — guards: requires productId (toast error otherwise) and, for non-'working' ranges, a `from` value. Builds `GenerateInput { productId, rangeType, from?, to?, model?, createReviewEntries }` and calls `start(input, { productName })`.
- `handleCancel` — `cancel()`.
- `handleCopy` — copies `result.outputs[activeTab]`.
- Product select onValueChange resets from/to; range select resets from/to.

## Rendered UI sections
1. Header (GitBranch icon + description referencing Ollama model, Settings-configurable).
2. Configuration card: Product select (eligible = has repoPath; shows icon + repoPath hint), Range select (RANGE_OPTIONS), Ollama Model override Input + suggested model chips; conditional From/To inputs per range (tags→Selects incl. HEAD, commit→text inputs, date→date inputs); "Send drafts to review queue" checkbox (createReviewEntries, disabled while running); Generate/Cancel button + warning when no eligible products.
3. Progress panel (while running or logs present and no result): spinner, progress bar (`progress.current/progress.total` with STEP_LABELS[currentStep]), scrollable log list colored by log.type (error/warn/success/info) with step tags, error banner.
4. Results panel (when result): stats bar badges (filesAnalyzed, chunksProcessed, commits, model; and if reviewEntriesCreated>0 a Link to `/review`), tab bar (OUTPUT_TABS) + Copy button, markdown output via `SimpleMarkdown` for `result.outputs[activeTab]`.

## Important logic (AI streaming via changelogGen service / SSE)
- Streaming is NOT handled directly in this component. All pipeline/streaming state (`running, logs, currentStep, progress, result, error`) and the `start`/`cancel` actions come from `useChangelogGen()` (ChangelogGenContext). Source comment: "Pipeline state lives in a root provider so generation keeps running (and stays visible via the docked mini-player) when navigating away."
- The page calls `start(GenerateInput, { productName })`; the context/provider owns the connection to the changelogGen service and pushes incremental `logs` and `progress` updates, which this component renders live (auto-scrolling via the [logs] effect). The exact transport (SSE/fetch stream) is defined in ChangelogGenContext / the changelogGen service, not in this file — Not determinable from source here.
- Pipeline steps (from STEP_LABELS): git → classify → summarize → report → review.
- Outputs: four report variants keyed under `result.outputs`. `createReviewEntries` toggles creation of draft review-queue entries (one per commit, or grouped logical entries for the working tree).

## Relationships
- Depends on `products` service (repo-eligible products) and `changelogGen` service (`getProductTags`, `getProductModels`, types).
- Consumes `ChangelogGenContext` (root-level provider) which drives the actual AI generation/streaming and persists across navigation (docked mini-player).
- Links to `/review` (review queue) when review entries are created. Uses PageTransition + stagger animation helpers.
