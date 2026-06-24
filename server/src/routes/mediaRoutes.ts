import { Router } from 'express';
import { getMediaList, deleteMedia, bulkDeleteMedia, purgeOrphaned, purgeOrphanedStream } from '../controllers/MediaController';
import { requireAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', getMediaList);
// Destructive media operations are admin-only (orphan detection is global).
router.delete('/:filename', requireAdmin, deleteMedia);
router.post('/bulk-delete', requireAdmin, bulkDeleteMedia);
router.post('/purge-orphaned', requireAdmin, purgeOrphaned);
router.post('/purge-orphaned-stream', requireAdmin, purgeOrphanedStream);

export default router;
