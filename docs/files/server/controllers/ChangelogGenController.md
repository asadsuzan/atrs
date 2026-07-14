# `server/src/controllers/ChangelogGenController.ts`
**Purpose:** AI changelog generation: run the 4-stage pipeline over a product's git repo (SSE-streamed), list git tags, and list available Ollama models.
**Language / Size:** TypeScript / 3684 bytes
## Exports
Named exports: `generate`, `getTags`, `getModels`.
## Imports (Internal / External)
- Internal: `../models/Product` (`Product`), `../utils/sseStream` (`runStreamJob`), `../services/ChangelogGenService` (`runPipeline`, type `RangeType`), `../utils/ollama` (`getOllamaUrl`, `getOllamaHeaders`), `../utils/ownership` (`assertOwner`), `../utils/repoAccess` (`assertRepoPathAllowed`).
- External: `express` (`Request`,`Response`,`NextFunction`), `child_process` (`execFile`), `util` (`promisify`).
## Handlers / Functions
- **generate(req,res,next)** — POST /api/changelog-gen/generate. Reads `req.body`: `productId`, `rangeType`, `from`, `to`, `model`, `createReviewEntries`. Validation at route via `generateChangelogSchema`. Loads product (`Product.findById(productId).select('name repoPath ownerId').lean()`), `assertOwner(product, req.user)`, requires `repoPath` (else `400`), `assertRepoPathAllowed(repoPath)`. Streams via `runStreamJob`, invoking `runPipeline({repoPath, rangeType, from, to, model, createReviewEntries, productId, ownerId}, ctx)`. On error: if headers already sent, logs and returns; else `next(error)`.
- **getTags(req,res,next)** — GET /api/changelog-gen/tags/:productId. Reads `req.params.productId` (route Zod: `params.productId = objectId`). Loads product, `assertOwner`, requires `repoPath` (`400 'No repository path'`), `assertRepoPathAllowed`. Runs `git tag --sort=-creatordate` via `promisify(execFile)` (cwd=repoPath, 10s timeout); returns tag array. On git failure returns `[]` (not a git repo / no tags).
- **getModels(_req,res,_next)** — GET /api/changelog-gen/models. `fetch(getOllamaUrl()/api/tags, {headers:getOllamaHeaders()})`; maps `data.models[].name`. Returns `[]` on non-ok response or thrown error.
## Important logic & design patterns
- Ownership + repo-path jail enforced before any git/subprocess access (`assertOwner`, `assertRepoPathAllowed`).
- SSE streaming for the long-running pipeline; post-stream errors can't use the JSON error path (`res.headersSent` check).
- Graceful degradation: tag/model listings swallow errors into empty arrays.
## Relationships
- Routed by `changelogGenRoutes.ts` (mounted `/api/changelog-gen`, behind `requireAuth`+`requireActive`).
- Delegates pipeline to `ChangelogGenService.runPipeline`; uses Ollama helper utils.
