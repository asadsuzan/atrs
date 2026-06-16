import { Router } from 'express';
import * as ProductController from '../controllers/ProductController';
import { validate } from '../middlewares/validate';
import { createProductSchema, updateProductSchema } from '../schemas/product.schema';
import { upsertMarketingSchema } from '../schemas/marketing.schema';
import { idParamSchema } from '../schemas/common.schema';
import { ProductMarketingController } from '../controllers/ProductMarketingController';

const marketingController = new ProductMarketingController();

const router = Router();

router.post('/', validate(createProductSchema), ProductController.createProduct);
router.get('/', ProductController.getProducts);
router.delete('/bulk', ProductController.bulkDeleteProducts);
router.get('/wporg-preview', ProductController.wpOrgPreview);
router.post('/import-from-wporg', ProductController.importFromWpOrg);
router.post('/import-from-wporg/cancel', ProductController.cancelWpOrgImport);
router.get('/:id', validate(idParamSchema), ProductController.getProductById);
router.patch('/:id', validate(updateProductSchema), ProductController.updateProduct);
router.delete('/:id', validate(idParamSchema), ProductController.deleteProduct);

// Marketing routes
router.get('/:id/marketing', validate(idParamSchema), marketingController.getMarketingData);
router.put('/:id/marketing', validate(upsertMarketingSchema), marketingController.upsertMarketingData);
router.delete('/:id/marketing', validate(idParamSchema), marketingController.deleteMarketingData);

export default router;
