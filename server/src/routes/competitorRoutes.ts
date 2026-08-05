import { Router } from 'express';
// Auth middleware is applied where this router is mounted, in app.ts.
import { validate } from '../middlewares/validate';
import {
  createCompetitorSchema,
  updateCompetitorSchema,
  competitorParamsSchema,
  competitorDetailParamsSchema,
} from '../schemas/competitor.schema';
import {
  getCompetitors,
  getCompetitorDetails,
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
  autoDiscoverCompetitors,
  discoverCompetitors,
  trackCompetitors,
  syncCompetitors,
} from '../controllers/CompetitorController';

const router = Router();

/**
 * Action routes are declared before `/:productId/:competitorId`.
 *
 * Express matches in declaration order, so without this ordering a request to
 * `/:productId/discover` would bind "discover" to `competitorId` and return 404.
 */
router.get('/:productId/discover', validate(competitorParamsSchema), discoverCompetitors);
router.post('/:productId/track', validate(competitorParamsSchema), trackCompetitors);
router.post('/:productId/sync', validate(competitorParamsSchema), syncCompetitors);
router.post('/:productId/auto-discover', validate(competitorParamsSchema), autoDiscoverCompetitors);

router.get('/:productId', validate(competitorParamsSchema), getCompetitors);
router.post('/:productId', validate(createCompetitorSchema), createCompetitor);

router.get('/:productId/:competitorId', validate(competitorDetailParamsSchema), getCompetitorDetails);
router.patch('/:productId/:competitorId', validate(updateCompetitorSchema), updateCompetitor);
router.delete('/:productId/:competitorId', validate(competitorDetailParamsSchema), deleteCompetitor);

export default router;
