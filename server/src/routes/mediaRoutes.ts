import { Router } from 'express';
import { getMediaList, deleteMedia, purgeOrphaned } from '../controllers/MediaController';

const router = Router();

router.get('/', getMediaList);
router.delete('/:filename', deleteMedia);
router.post('/purge-orphaned', purgeOrphaned);

export default router;
