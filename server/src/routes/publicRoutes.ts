import { Router } from 'express';
import * as ReleaseController from '../controllers/ReleaseController';
import * as IssueController from '../controllers/IssueController';

// Unauthenticated, read-only endpoints safe to expose to the public web
// (e.g. the hosted /changelog/:id and /issues/:id pages).
const router = Router();

router.get('/changelog/:id', ReleaseController.getPublicChangelog);
router.get('/issues/:id', IssueController.getPublicIssues);

export default router;
