import { Router } from 'express';
import * as StreakController from '../controllers/StreakController';
import { validate } from '../middlewares/validate';
import { createDailyLogSchema } from '../schemas/streak.schema';
import { idParamSchema } from '../schemas/common.schema';

// Personal daily-logging habit: a private work journal with streak stats,
// independent of the changelog/Activity schema.
const router = Router();

router.get('/', StreakController.getLoggingStreak);
router.post('/log', validate(createDailyLogSchema), StreakController.createDailyLog);
router.delete('/log/:id', validate(idParamSchema), StreakController.deleteDailyLog);

export default router;
