import { Router } from 'express';
import * as GitHubController from '../controllers/GitHubController';
import { validate } from '../middlewares/validate';
import { connectGithubSchema, syncReleasesSchema } from '../schemas/github.schema';

const router = Router();

// Per-user GitHub connection (token stored encrypted, scoped to the caller).
router.get('/status', GitHubController.getStatus);
router.post('/connect', validate(connectGithubSchema), GitHubController.connect);
router.delete('/connect', GitHubController.disconnect);

// Pull a product's GitHub Releases into its Versions.
router.post('/products/:id/sync-releases', validate(syncReleasesSchema), GitHubController.syncReleases);

export default router;
