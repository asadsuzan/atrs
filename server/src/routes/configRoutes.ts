import { Router } from 'express';
import { getConfig, updateConfig, testStorageConnection } from '../controllers/ConfigController';

const router = Router();

router.get('/', getConfig);
router.post('/', updateConfig);
router.post('/storage/test', testStorageConnection);

export default router;
