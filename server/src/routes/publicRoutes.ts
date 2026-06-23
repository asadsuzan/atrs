import { Router } from 'express';
import * as ReleaseController from '../controllers/ReleaseController';

// Unauthenticated, read-only endpoints safe to expose to the public web
// (e.g. the hosted /changelog/:id page).
const router = Router();

router.get('/changelog/:id', ReleaseController.getPublicChangelog);

export default router;
