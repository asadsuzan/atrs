import { Router } from 'express';
import { getAuditLogs } from '../controllers/AuditLogController';

const router = Router();

router.get('/', getAuditLogs);

export default router;
