import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string(),
    githubUrl: z.string().url('Invalid URL format'),
    description: z.string().optional(),
    category: z.enum(['plugin', 'block', 'theme', 'standalone']),
    status: z.enum(['active', 'inactive']).optional(),
    icon: z.string().optional(),
    banner: z.string().optional(),
    wpOrgSlug: z.string().optional(),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    githubUrl: z.string().url('Invalid URL format').optional(),
    description: z.string().optional(),
    category: z.enum(['plugin', 'block', 'theme', 'standalone']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    icon: z.string().optional(),
    banner: z.string().optional(),
    wpOrgSlug: z.string().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});
