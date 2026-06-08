import { Router } from 'express';
import * as VersionController from '../controllers/VersionController';

const router = Router();

router.post('/', VersionController.createVersion);
router.get('/', VersionController.getVersions);
router.get('/:id', VersionController.getVersionById);
router.patch('/:id', VersionController.updateVersion);
router.delete('/:id', VersionController.deleteVersion);

export default router;
