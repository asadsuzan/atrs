import { z } from 'zod';

export const createDailyLogSchema = z.object({
  body: z.object({
    note: z.string().trim().min(3, 'Tell us what you worked on').max(500),
  }),
});
