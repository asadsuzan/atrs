import { Router } from 'express';
import * as ProductController from '../controllers/ProductController';
import { validate } from '../middlewares/validate';
import { createProductSchema, updateProductSchema } from '../schemas/product.schema';
import { upsertMarketingSchema } from '../schemas/marketing.schema';
import { idParamSchema } from '../schemas/common.schema';
import { ProductMarketingController } from '../controllers/ProductMarketingController';
import * as ReleaseController from '../controllers/ReleaseController';
import { browseDirs } from '../controllers/FsController';

const marketingController = new ProductMarketingController();

const router = Router();

router.post('/', validate(createProductSchema), ProductController.createProduct);
router.get('/', ProductController.getProducts);
router.delete('/bulk', ProductController.bulkDeleteProducts);
router.post('/bulk-delete-stream', ProductController.bulkDeleteProductsStream);
router.get('/stale', ProductController.getStaleProducts);
router.get('/browse-dirs', browseDirs);
router.get('/wporg-preview', ProductController.wpOrgPreview);
router.get('/wporg-preview-by-slug', ProductController.wpOrgPreviewBySlug);
router.post('/import-from-wporg', ProductController.importFromWpOrg);
router.post('/import-from-wporg/cancel', ProductController.cancelWpOrgImport);
router.get('/:id', validate(idParamSchema), ProductController.getProductById);
router.get('/:id/release', validate(idParamSchema), ReleaseController.getProductRelease);
router.get('/:id/wp-stats', validate(idParamSchema), ProductController.getProductWpStats);
router.patch('/:id', validate(updateProductSchema), ProductController.updateProduct);
router.delete('/:id', validate(idParamSchema), ProductController.deleteProduct);

// Marketing routes
router.get('/:id/marketing', validate(idParamSchema), marketingController.getMarketingData);
router.put('/:id/marketing', validate(upsertMarketingSchema), marketingController.upsertMarketingData);
router.delete('/:id/marketing', validate(idParamSchema), marketingController.deleteMarketingData);

export default router;
