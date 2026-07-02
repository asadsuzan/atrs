import { Router } from 'express';
import * as ChangelogGenController from '../controllers/ChangelogGenController';
import { validate } from '../middlewares/validate';
import { generateChangelogSchema } from '../schemas/changelogGen.schema';

const router = Router();

// POST /generate — SSE-streamed pipeline execution
router.post('/generate', validate(generateChangelogSchema), ChangelogGenController.generate);

// GET /tags/:productId — list git tags for dropdown
router.get('/tags/:productId', ChangelogGenController.getTags);

// GET /models — list Ollama models
router.get('/models', ChangelogGenController.getModels);

export default router;
