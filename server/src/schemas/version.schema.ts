import { z } from 'zod';
import { objectId } from './common.schema';

export const createVersionSchema = z.object({
  body: z.object({
    productId: objectId,
    label: z.string().min(1, 'label is required'),
    notes: z.string().optional(),
    releasedAt: z.string().nullable().optional().transform(val => (val === '' ? null : val)),
  }),
});

export const updateVersionSchema = z.object({
  body: z.object({
    productId: objectId.optional(),
    label: z.string().min(1).optional(),
    notes: z.string().optional(),
    releasedAt: z.string().nullable().optional().transform(val => (val === '' ? null : val)),
  }),
  params: z.object({
    id: objectId,
  }),
});
