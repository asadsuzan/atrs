import { z } from 'zod';
import { objectId } from './common.schema';
import { hasControlChars } from '../utils/sanitize';

/**
 * A git revision (tag / branch / sha) or date string that will be handed to
 * `git`. Rejects a leading '-' (so it can't be parsed as an option - argument
 * injection) and control characters, while still allowing dates like
 * "2 weeks ago".
 */
const gitRef = z
  .string()
  .max(200)
  .refine((v) => !v.startsWith('-'), 'Value cannot start with "-"')
  .refine((v) => !hasControlChars(v), 'Value contains control characters');

export const generateChangelogSchema = z.object({
  body: z.object({
    productId: objectId,
    rangeType: z.enum(['tags', 'commit', 'date', 'working']),
    from: gitRef.optional(),
    to: gitRef.optional(),
    model: z.string().max(120).optional(),
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
