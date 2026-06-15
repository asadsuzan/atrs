import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err.stack);

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation Error',
      errors: (err as any).issues || (err as any).errors,
    });
  }

  // MongoDB duplicate-key error (e.g. a duplicate product slug for the same owner).
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {}).join(', ') || 'value';
    return res.status(409).json({
      message: `A record with this ${field} already exists.`,
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
