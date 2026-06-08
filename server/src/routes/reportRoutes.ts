import { Router } from 'express';
import * as ReportController from '../controllers/ReportController';

const router = Router();

router.get('/monthly', ReportController.getMonthlyReport);

export default router;
