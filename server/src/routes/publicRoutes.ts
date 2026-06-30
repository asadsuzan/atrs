import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ReleaseController from '../controllers/ReleaseController';
import * as IssueController from '../controllers/IssueController';
import * as ProductController from '../controllers/ProductController';
import { validate } from '../middlewares/validate';
import { publicReportIssueSchema } from '../schemas/issue.schema';

// Unauthenticated, read-only endpoints safe to expose to the public web
// (e.g. the /explore directory and the hosted /changelog/:id and /issues/:id
// pages), plus the public "report an issue" submission.
const router = Router();

// Stricter limiter for the one public write endpoint, to blunt spam. Keyed per
// IP, on top of the global /api limiter.
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many reports from this address. Please try again later.' },
});

router.get('/products', ProductController.getPublicProducts);
router.get('/changelog/:id', ReleaseController.getPublicChangelog);
router.get('/issues/:id', IssueController.getPublicIssues);
router.post('/products/:id/issues', reportLimiter, validate(publicReportIssueSchema), IssueController.reportPublicIssue);

export default router;
