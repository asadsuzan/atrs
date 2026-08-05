import { z } from 'zod';
import { Types } from 'mongoose';

// Validation helper for MongoDB ObjectId
const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId format',
});

export const createCompetitorSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    url: z.string().url().optional().or(z.literal('')),
    type: z.enum(['direct', 'indirect', 'alternative']).default('direct'),
    wpOrgSlug: z.string().optional().or(z.literal('')),
    rssFeedUrl: z.string().url().optional().or(z.literal('')),
    keyFeatures: z.array(z.string()).optional().default([]),
    status: z.enum(['active', 'inactive']).default('active'),
  }),
});

export const updateCompetitorSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    url: z.string().url().optional().or(z.literal('')),
    type: z.enum(['direct', 'indirect', 'alternative']).optional(),
    wpOrgSlug: z.string().optional().or(z.literal('')),
    rssFeedUrl: z.string().url().optional().or(z.literal('')),
    keyFeatures: z.array(z.string()).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
  params: z.object({
    productId: objectIdSchema,
    competitorId: objectIdSchema,
  }),
});

export const competitorParamsSchema = z.object({
  params: z.object({
    productId: objectIdSchema,
  }),
});

export const competitorDetailParamsSchema = z.object({
  params: z.object({
    productId: objectIdSchema,
    competitorId: objectIdSchema,
  }),
});
