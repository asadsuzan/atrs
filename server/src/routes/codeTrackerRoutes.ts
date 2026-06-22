import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth';
import { getStatus, getFeed } from '../controllers/CodeTrackerController';

// Mounted behind requireAuth + requireActive in index.ts.
const router = Router();

router.get('/status', requireAdmin, getStatus);
router.get('/feed', getFeed);

export default router;
