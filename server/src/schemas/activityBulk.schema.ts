import { z } from 'zod';
import { objectId } from './common.schema';

// `.strict()` rejects ANY key not listed below — including raw MongoDB update
// operators ($set, $addToSet, $pull, $rename, ...). The client sends plain
// field values and named tag operations; the server assembles the actual
// update document (see buildActivityBulkUpdate). This closes the NoSQL
// operator-injection path where client-supplied operators reached updateMany.
export const bulkUpdateActivitiesSchema = z.object({
  body: z.object({
    ids: z.array(objectId).min(1, 'ids array is required'),
    update: z.object({
      type: z.enum(['feature', 'improvement', 'bug-fix']).optional(),
      tier: z.enum(['free', 'pro']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      versionId: objectId.nullable().optional(),
      tags: z.array(z.string()).optional(),
      addTags: z.array(z.string()).optional(),
      removeTags: z.array(z.string()).optional(),
      activityDate: z.string().optional(),
    }).strict(),
  }).strict(),
});

export const bulkDeleteActivitiesSchema = z.object({
  body: z.object({
    ids: z.array(objectId).min(1, 'ids array is required'),
  }),
});
