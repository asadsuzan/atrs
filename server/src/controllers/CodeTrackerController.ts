import { Request, Response, NextFunction } from 'express';
import { codeTrackerService } from '../services/CodeTrackerService';
import { Activity } from '../models/Activity';
import { scopeFilter } from '../utils/ownership';

/** Admin-only: current tracker state (enabled, model, watched repos). */
export const getStatus = (_req: Request, res: Response) => {
  res.status(200).json(codeTrackerService.status());
};

/** Recent auto-tracked changelog drafts ("Currently Working On" feed), owner-scoped. */
export const getFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);
    const filter = scopeFilter(req.user, { autoTracked: true });
    const activities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('productId', 'name icon')
      .lean();
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};
