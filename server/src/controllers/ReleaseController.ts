import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ProductService } from '../services/ProductService';
import { ReleaseService } from '../services/ReleaseService';
import { Product } from '../models/Product';

const productService = new ProductService();
const releaseService = new ReleaseService();

/** Authenticated: the full release payload (incl. exports) for the owner's UI. */
export const getProductRelease = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.getProductById(req.params.id as string, req.user!);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const data = await releaseService.buildRelease(product);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Public (no auth): the changelog for a product whose owner has opted in via
 * `publicChangelogEnabled`. Omits the app-only export formats. Returns 404 for
 * unknown/malformed ids and for products that haven't been published.
 */
export const getPublicChangelog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Changelog not found' });
    }
    const product = await Product.findById(id);
    if (!product || !product.publicChangelogEnabled) {
      return res.status(404).json({ message: 'Changelog not found' });
    }
    const data = await releaseService.buildRelease(product);
    res.status(200).json({
      product: data.product,
      releases: data.releases,
      unreleased: data.unreleased,
    });
  } catch (error) {
    next(error);
  }
};
