import { Router } from 'express';
import * as VersionController from '../controllers/VersionController';
import { validate } from '../middlewares/validate';
import { createVersionSchema, updateVersionSchema } from '../schemas/version.schema';
import { idParamSchema } from '../schemas/common.schema';

const router = Router();

router.post('/', validate(createVersionSchema), VersionController.createVersion);
router.get('/', VersionController.getVersions);
router.get('/:id', validate(idParamSchema), VersionController.getVersionById);
router.patch('/:id', validate(updateVersionSchema), VersionController.updateVersion);
router.delete('/:id', validate(idParamSchema), VersionController.deleteVersion);

export default router;
