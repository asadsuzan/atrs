import { Router } from 'express';
import * as ReportController from '../controllers/ReportController';

const router = Router();

router.get('/monthly', ReportController.getMonthlyReport);
router.get('/trend', ReportController.getTrend);
router.get('/annual', ReportController.getAnnual);

export default router;
