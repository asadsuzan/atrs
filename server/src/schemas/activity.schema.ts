import { z } from 'zod';

export const createActivitySchema = z.object({
  body: z.object({
    productId: z.string(),
    type: z.enum(['feature', 'improvement', 'bug-fix']),
    title: z.string(),
    shortDescription: z.string(),
    tier: z.enum(['free', 'pro']).optional(),
    tags: z.array(z.string()).optional(),
    mediaType: z.enum(['image', 'gif', 'video']).optional(),
    mediaUrl: z.string().optional(),
    items: z
      .array(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          mediaType: z.enum(['image', 'gif', 'video']).optional(),
          mediaUrl: z.string().optional(),
        })
      )
      .default([]),
    activityDate: z.string(),
  }),
});

export const updateActivitySchema = z.object({
  body: z.object({
    productId: z.string().optional(),
    type: z.enum(['feature', 'improvement', 'bug-fix']).optional(),
    title: z.string().optional(),
    shortDescription: z.string().optional(),
    tier: z.enum(['free', 'pro']).optional(),
    tags: z.array(z.string()).optional(),
    mediaType: z.enum(['image', 'gif', 'video']).optional(),
    mediaUrl: z.string().optional(),
    items: z
      .array(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          mediaType: z.enum(['image', 'gif', 'video']).optional(),
          mediaUrl: z.string().optional(),
        })
      )
      .optional(),
    activityDate: z.string().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});
