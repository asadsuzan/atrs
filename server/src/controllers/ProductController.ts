import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { ProductService } from '../services/ProductService';
import { WpStatsService } from '../services/WpStatsService';
import { importSessionManager } from '../services/ImportSessionManager';
import { runStreamJob } from '../utils/sseStream';
import { getStaleAlertDays } from '../utils/appConfig';

const productService = new ProductService();
const wpStatsService = new WpStatsService();

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

/** Public (no auth): the directory of products with a public surface enabled. */
export const getPublicProducts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productService.getPublicProducts();
    res.status(200).json({ products });
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

/** Products with no changelog update within the configured window (owner-scoped). */
export const getStaleProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = getStaleAlertDays();
    const result = await productService.getStaleProducts(req.user!, days);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/** Live WordPress.org ecosystem stats for a product's plugin (owner-scoped). */
export const getProductWpStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.getProductById(req.params.id as string, req.user!);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!product.wpOrgSlug) return res.status(200).json({ slug: null });
    const stats = await wpStatsService.getStats(product.wpOrgSlug);
    res.status(200).json(stats);
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

export const bulkDeleteProductsStream = async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids must be a non-empty array' });
  }

  await runStreamJob(req, res, async ({ emit, isCancelled }) => {
    emit({ type: 'info', step: 'start', message: `Deleting ${ids.length} product${ids.length !== 1 ? 's' : ''} and all their data...` });
    let deleted = 0;
    const errors: string[] = [];
    let cancelled = false;

    for (let i = 0; i < ids.length; i++) {
      if (isCancelled()) { cancelled = true; break; }
      const id = ids[i];
      const ctx = { itemIndex: i + 1, totalItems: ids.length };
      try {
        const counts = await productService.getCascadeCounts(id);
        emit({ ...ctx, type: 'info', step: 'delete', message: `Removing product + ${counts.activities} activities, ${counts.versions} versions, ${counts.marketing} marketing & assets...` });
        const product = await productService.deleteProduct(id, req.user!);
        if (product) {
          deleted++;
          emit({ ...ctx, type: 'success', step: 'delete', label: product.name, message: `✓ Deleted "${product.name}"` });
        } else {
          errors.push(`${id}: not found`);
          emit({ ...ctx, type: 'warn', step: 'delete', message: `Product not found` });
        }
      } catch (err: any) {
        errors.push(`${id}: ${err.message}`);
        emit({ ...ctx, type: 'error', step: 'delete', message: `✗ Failed: ${err.message}` });
      }
    }

    emit({
      type: errors.length ? 'warn' : 'success',
      step: 'summary',
      message: `${cancelled ? 'Stopped' : 'Done'}: ${deleted} deleted, ${errors.length} error(s)`,
    });
    return { deleted, errors, cancelled, total: ids.length };
  });
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

export const wpOrgPreviewBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slugs } = req.query as { slugs?: string };
    const slugList = (slugs || '').split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    if (slugList.length === 0) return res.status(400).json({ message: 'slugs is required' });
    const plugins = await productService.wpOrgPreviewBySlug(slugList, req.user!);
    res.status(200).json(plugins);
  } catch (error) {
    next(error);
  }
};

export const importFromWpOrg = async (req: Request, res: Response, next: NextFunction) => {
  console.log('[WP Import Controller] POST /import-from-wporg hit, body:', JSON.stringify(req.body));
  const { username, slugs } = req.body;
  // Either an author username (catalogue import) or an explicit slug list
  // (onboarding "import by slug") is required — slugs alone are enough.
  if (!Array.isArray(slugs) || slugs.length === 0) return res.status(400).json({ message: 'slugs must be a non-empty array' });

  // Stream import progress to the client as Server-Sent Events.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable output buffering in Nginx / proxy layers
  });
  // Flush headers immediately so the client's reader starts receiving.
  res.write(': ok\n\n');
  req.socket.setKeepAlive(true);
  req.socket.setTimeout(0);

  // Register a cancellable session and tell the client its id up front so it
  // can hit the cancel endpoint without tearing down this stream.
  const sessionId = randomUUID();
  importSessionManager.create(sessionId, req.user!.id);

  // If the client disconnects abruptly (closes the dialog / tab) rather than
  // cancelling gracefully, treat it as a cancel so the import loop stops and
  // rolls back its created products. We can't stream those events to a dead
  // socket, but the DB is still cleaned up.
  let clientGone = false;
  req.on('close', () => {
    clientGone = true;
    importSessionManager.cancel(sessionId, req.user!.id);
  });

  const send = (event: string, data: unknown) => {
    if (clientGone || res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('session', { sessionId });

  try {
    const result = await productService.importFromWpOrg(
      username,
      slugs,
      req.user!,
      (progress) => send('progress', progress),
      () => importSessionManager.isCancelled(sessionId),
    );
    console.log('[WP Import Controller] import result:', JSON.stringify({ created: result.created.length, updated: result.updated.length, errors: result.errors, cancelled: result.cancelled, rolledBack: result.rolledBack }));
    send('complete', {
      created: result.created.length,
      updated: result.updated.length,
      errors: result.errors,
      cancelled: result.cancelled,
      rolledBack: result.rolledBack,
    });
  } catch (error: any) {
    console.error('[WP Import Controller] error:', error);
    send('error', { message: error?.message || 'Import failed' });
  } finally {
    importSessionManager.delete(sessionId);
    if (!res.writableEnded) res.end();
  }
};

export const cancelWpOrgImport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ message: 'sessionId is required' });
    }
    const found = importSessionManager.cancel(sessionId, req.user!.id);
    if (!found) {
      // Session already finished or never existed — nothing to cancel.
      return res.status(404).json({ message: 'Import session not found' });
    }
    res.status(200).json({ message: 'Cancellation requested' });
  } catch (error) {
    next(error);
  }
};
