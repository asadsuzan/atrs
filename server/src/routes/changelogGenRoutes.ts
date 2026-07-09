import { Router } from 'express';
import { z } from 'zod';
import * as ChangelogGenController from '../controllers/ChangelogGenController';
import { validate } from '../middlewares/validate';
import { generateChangelogSchema } from '../schemas/changelogGen.schema';
import { objectId } from '../schemas/common.schema';

const router = Router();

// POST /generate — SSE-streamed pipeline execution
router.post('/generate', validate(generateChangelogSchema), ChangelogGenController.generate);

// GET /tags/:productId — list git tags for dropdown
router.get(
  '/tags/:productId',
  validate(z.object({ params: z.object({ productId: objectId }) })),
  ChangelogGenController.getTags,
);

// GET /models — list Ollama models
router.get('/models', ChangelogGenController.getModels);

export default router;
