import { Router } from 'express';
import * as ProductController from '../controllers/ProductController';
import { validate } from '../middlewares/validate';
import { createProductSchema, updateProductSchema } from '../schemas/product.schema';
import { ProductMarketingController } from '../controllers/ProductMarketingController';

const marketingController = new ProductMarketingController();

const router = Router();

router.post('/', validate(createProductSchema), ProductController.createProduct);
router.get('/', ProductController.getProducts);
router.get('/:id', ProductController.getProductById);
router.patch('/:id', validate(updateProductSchema), ProductController.updateProduct);
router.delete('/:id', ProductController.deleteProduct);

// Marketing routes
router.get('/:id/marketing', marketingController.getMarketingData);
router.put('/:id/marketing', marketingController.upsertMarketingData);
router.delete('/:id/marketing', marketingController.deleteMarketingData);

export default router;
