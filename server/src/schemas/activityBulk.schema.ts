import { z } from 'zod';
import { objectId } from './common.schema';

export const bulkUpdateActivitiesSchema = z.object({
  body: z.object({
    ids: z.array(objectId).min(1, 'ids array is required'),
    update: z.object({
      type: z.enum(['feature', 'improvement', 'bug-fix']).optional(),
      tier: z.enum(['free', 'pro']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      versionId: objectId.nullable().optional(),
      tags: z.array(z.string()).optional(),
      activityDate: z.string().optional(),
    }).passthrough(),
  }),
});

export const bulkDeleteActivitiesSchema = z.object({
  body: z.object({
    ids: z.array(objectId).min(1, 'ids array is required'),
  }),
});
