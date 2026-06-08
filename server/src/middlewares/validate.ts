import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate =
  (schema: ZodSchema<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) {
        Object.keys(req.query).forEach(k => delete req.query[k as keyof typeof req.query]);
        Object.assign(req.query, parsed.query);
      }
      if (parsed.params !== undefined) {
        Object.keys(req.params).forEach(k => delete req.params[k as keyof typeof req.params]);
        Object.assign(req.params, parsed.params);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
