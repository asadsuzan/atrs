import { Router } from 'express';
import { getConfig, updateConfig } from '../controllers/ConfigController';

const router = Router();

router.get('/', getConfig);
router.post('/', updateConfig);

export default router;
