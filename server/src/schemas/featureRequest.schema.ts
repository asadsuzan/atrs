import { z } from 'zod';
import { objectId } from './common.schema';

const status = z.enum(['pending', 'planned', 'in-progress', 'done', 'declined']);

export const createFeatureRequestSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3, 'Please describe the feature').max(200),
    description: z.string().trim().max(5000).optional(),
  }),
});

/**
 * Requesters may reword their own pending request (title/description);
 * status and adminNote are honored only for admins — enforced in the service.
 */
export const updateFeatureRequestSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    status: status.optional(),
    adminNote: z.string().trim().max(2000).optional(),
  }),
  params: z.object({
    id: objectId,
  }),
});
