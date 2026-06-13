import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/ProductService';

const productService = new ProductService();

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.createProduct(req.body, req.user!);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productService.getProducts(req.query, req.user!);
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.getProductById(req.params.id as string, req.user!);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.updateProduct(req.params.id as string, req.body, req.user!);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.deleteProduct(req.params.id as string, req.user!);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'ids must be a non-empty array' });
    const result = await productService.bulkDeleteProducts(ids, req.user!);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const wpOrgPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.query as { username: string };
    if (!username) return res.status(400).json({ message: 'username is required' });
    const plugins = await productService.wpOrgPreview(username, req.user!);
    res.status(200).json(plugins);
  } catch (error) {
    next(error);
  }
};

export const importFromWpOrg = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, slugs } = req.body;
    if (!username) return res.status(400).json({ message: 'username is required' });
    if (!Array.isArray(slugs) || slugs.length === 0) return res.status(400).json({ message: 'slugs must be a non-empty array' });
    const result = await productService.importFromWpOrg(username, slugs, req.user!);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
