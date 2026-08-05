import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture the sort object the repository hands to Mongoose so we can assert the
// ordering is total. Paging correctness depends entirely on that.
const sortSpy = vi.fn();

vi.mock('../models/Activity', () => {
  const chain: any = {
    sort: (s: any) => { sortSpy(s); return chain; },
    skip: () => chain,
    limit: () => chain,
    populate: () => chain,
    then: (resolve: any) => resolve([]),
  };
  return {
    Activity: {
      find: () => chain,
      countDocuments: async () => 0,
    },
  };
});

import { ActivityRepository } from './ActivityRepository';

describe('ActivityRepository.findAll paging stability', () => {
  const repo = new ActivityRepository();
  beforeEach(() => sortSpy.mockClear());

  it('breaks ties on _id so a row cannot appear on two pages', async () => {
    // displayOrder is only set by manual reordering, so imported entries all tie
    // on `undefined`; without a unique tiebreaker skip/limit returns the same
    // row on several pages and silently drops others.
    await repo.findAll({}, { page: 2, limit: 9, sortBy: 'displayOrder', sortOrder: 'asc' });
    expect(sortSpy).toHaveBeenCalledWith({ displayOrder: 1, _id: 1 });
  });

  it('keeps the tiebreaker aligned with the requested direction', async () => {
    await repo.findAll({}, { page: 1, limit: 10, sortBy: 'activityDate', sortOrder: 'desc' });
    expect(sortSpy).toHaveBeenCalledWith({ activityDate: -1, _id: -1 });
  });

  it('does not duplicate the key when sorting by _id itself', async () => {
    await repo.findAll({}, { page: 1, limit: 10, sortBy: '_id', sortOrder: 'desc' });
    expect(sortSpy).toHaveBeenCalledWith({ _id: -1 });
  });

  it('uses the default sort with a tiebreaker when none is given', async () => {
    await repo.findAll({});
    expect(sortSpy).toHaveBeenCalledWith({ activityDate: -1, _id: -1 });
  });
});
