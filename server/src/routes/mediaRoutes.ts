import { Router } from 'express';
import { getMediaList, deleteMedia, purgeOrphaned } from '../controllers/MediaController';
import { requireAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', getMediaList);
// Destructive media operations are admin-only (orphan detection is global).
router.delete('/:filename', requireAdmin, deleteMedia);
router.post('/purge-orphaned', requireAdmin, purgeOrphaned);

export default router;
