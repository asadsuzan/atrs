import createHttpError from './httpError';

/**
 * Whitelisted input for a bulk activity update. These are plain field values
 * and tag operations — NOT raw MongoDB update operators. The actual `$set` /
 * `$addToSet` / `$pull` document is assembled here, server-side, so no
 * client-supplied operator ever reaches the database (NoSQL-injection guard).
 */
export interface ActivityBulkUpdateInput {
  type?: 'feature' | 'improvement' | 'bug-fix';
  tier?: 'free' | 'pro';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  versionId?: string | null;
  tags?: string[];
  addTags?: string[];
  removeTags?: string[];
  activityDate?: string;
  needsReview?: boolean;
}

/** Fields that may be assigned via $set. */
const SET_FIELDS = ['type', 'tier', 'priority', 'versionId', 'needsReview'] as const;

export interface MongoUpdateDoc {
  $set?: Record<string, unknown>;
  $addToSet?: Record<string, unknown>;
  $pull?: Record<string, unknown>;
}

/**
 * Builds a safe MongoDB update document from whitelisted input.
 * Throws a 400 on an empty payload or a tags/addTags-removeTags conflict
 * (Mongo cannot $set and $addToSet the same path in one update).
 */
export function buildActivityBulkUpdate(input: ActivityBulkUpdateInput): MongoUpdateDoc {
  const update: MongoUpdateDoc = {};
  const $set: Record<string, unknown> = {};

  for (const field of SET_FIELDS) {
    if (input[field] !== undefined) $set[field] = input[field];
  }

  if (input.activityDate !== undefined) {
    const date = new Date(input.activityDate);
    if (Number.isNaN(date.getTime())) {
      throw createHttpError(400, 'activityDate is not a valid date');
    }
    $set.activityDate = date;
  }

  const replacingTags = input.tags !== undefined;
  const mutatingTags = input.addTags !== undefined || input.removeTags !== undefined;
  if (replacingTags && mutatingTags) {
    throw createHttpError(400, 'Cannot combine `tags` (replace) with `addTags`/`removeTags` in one update');
  }

  if (replacingTags) {
    $set.tags = input.tags;
  }

  if (Object.keys($set).length > 0) update.$set = $set;

  if (input.addTags && input.addTags.length > 0) {
    update.$addToSet = { tags: { $each: input.addTags } };
  }
  if (input.removeTags && input.removeTags.length > 0) {
    update.$pull = { tags: { $in: input.removeTags } };
  }

  if (Object.keys(update).length === 0) {
    throw createHttpError(400, 'No valid fields to update');
  }

  return update;
}
