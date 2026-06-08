
import { Router } from 'express';
import * as ActivityController from '../controllers/ActivityController';
import { validate } from '../middlewares/validate';
import { createActivitySchema, updateActivitySchema } from '../schemas/activity.schema';

const router = Router();

router.post('/bulk-update', ActivityController.bulkUpdateActivities);
router.delete('/bulk-delete', ActivityController.bulkDeleteActivities);
router.post('/', validate(createActivitySchema), ActivityController.createActivity);
router.get('/', ActivityController.getActivities);
router.get('/:id', ActivityController.getActivityById);
router.patch('/:id', validate(updateActivitySchema), ActivityController.updateActivity);
router.patch('/:id/reorder', ActivityController.reorderActivity);
router.delete('/:id', ActivityController.deleteActivity);

export default router;
