import { z } from 'zod';

/** A 24-char hex MongoDB ObjectId. */
export const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

/** Validates a route :id param as an ObjectId. */
export const idParamSchema = z.object({
  params: z.object({
    id: objectId,
  }),
});
