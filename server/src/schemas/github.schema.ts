import { z } from 'zod';
import { objectId } from './common.schema';

export const connectGithubSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'A GitHub token is required'),
  }),
});

export const syncReleasesSchema = z.object({
  params: z.object({
    id: objectId,
  }),
});
