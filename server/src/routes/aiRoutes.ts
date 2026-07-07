import { Router } from 'express';
import { suggest } from '../controllers/AiController';
import { validate } from '../middlewares/validate';
import { aiSuggestSchema } from '../schemas/ai.schema';

// Mounted behind requireAuth + requireActive in index.ts.
const router = Router();

router.post('/suggest', validate(aiSuggestSchema), suggest);

export default router;
