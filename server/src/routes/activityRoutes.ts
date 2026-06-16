
import { Router } from 'express';
import * as ActivityController from '../controllers/ActivityController';
import { validate } from '../middlewares/validate';
import { createActivitySchema, updateActivitySchema } from '../schemas/activity.schema';
import { bulkUpdateActivitiesSchema, bulkDeleteActivitiesSchema } from '../schemas/activityBulk.schema';
import { idParamSchema } from '../schemas/common.schema';

const router = Router();

router.post('/bulk-update', validate(bulkUpdateActivitiesSchema), ActivityController.bulkUpdateActivities);
router.delete('/bulk-delete', validate(bulkDeleteActivitiesSchema), ActivityController.bulkDeleteActivities);
router.post('/bulk-delete-stream', ActivityController.bulkDeleteActivitiesStream);
router.post('/', validate(createActivitySchema), ActivityController.createActivity);
router.get('/', ActivityController.getActivities);
router.get('/:id', validate(idParamSchema), ActivityController.getActivityById);
router.patch('/:id', validate(updateActivitySchema), ActivityController.updateActivity);
router.patch('/:id/reorder', validate(idParamSchema), ActivityController.reorderActivity);
router.delete('/:id', validate(idParamSchema), ActivityController.deleteActivity);

export default router;
