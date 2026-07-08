import { Router } from 'express';
import * as FeatureRequestController from '../controllers/FeatureRequestController';
import { validate } from '../middlewares/validate';
import { createFeatureRequestSchema, updateFeatureRequestSchema } from '../schemas/featureRequest.schema';
import { idParamSchema } from '../schemas/common.schema';

// In-app feature requests for the ATRS platform itself: any active user can
// submit and track their own; admins triage them (status + response note).
const router = Router();

router.post('/', validate(createFeatureRequestSchema), FeatureRequestController.createFeatureRequest);
router.get('/', FeatureRequestController.getFeatureRequests);
router.patch('/:id', validate(updateFeatureRequestSchema), FeatureRequestController.updateFeatureRequest);
router.delete('/:id', validate(idParamSchema), FeatureRequestController.deleteFeatureRequest);

export default router;
