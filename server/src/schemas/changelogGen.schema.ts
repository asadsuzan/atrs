import { z } from 'zod';

export const generateChangelogSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product is required'),
    rangeType: z.enum(['tags', 'commit', 'date', 'working']),
    from: z.string().optional(),
    to: z.string().optional(),
    model: z.string().optional(),
    createReviewEntries: z.boolean().optional(),
  }).refine(
    (data) => {
      // 'working' doesn't need from/to; everything else needs at least 'from'.
      if (data.rangeType === 'working') return true;
      return !!data.from;
    },
    { message: 'A "from" value is required for the selected range type' },
  ),
});
