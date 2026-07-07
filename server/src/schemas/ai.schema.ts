import { z } from 'zod';

export const aiSuggestSchema = z.object({
  body: z.object({
    task: z.enum(['title', 'description']),
    entity: z.string().min(1, 'entity is required').max(60),
    /** Structured form context (arbitrary shape per form). */
    context: z.record(z.string(), z.any()).optional(),
    /** Chosen title, used when task === 'description'. */
    title: z.string().max(300).optional(),
  }),
});
