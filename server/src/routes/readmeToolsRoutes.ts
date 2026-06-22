import { Router } from 'express';
import { readmeValidatorProxy } from '../controllers/ReadmeToolsController';

const router = Router();

// Public: proxied so it can be embedded in an <iframe> (see controller).
// GET serves the validator page; POST forwards the form submission.
router.get('/readme-validator', readmeValidatorProxy);
router.post('/readme-validator', readmeValidatorProxy);

export default router;
