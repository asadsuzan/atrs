import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/ActivityService';
import { runStreamJob } from '../utils/sseStream';

const activityService = new ActivityService();

export const createActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await activityService.createActivity(req.body, req.user!);
    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
};

export const getActivities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activities = await activityService.getActivities(req.query, req.user!);
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};

export const getActivityById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await activityService.getActivityById(req.params.id as string, req.user!);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.status(200).json(activity);
  } catch (error) {
    next(error);
  }
};

export const updateActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await activityService.updateActivity(req.params.id as string, req.body, req.user!);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.status(200).json(activity);
  } catch (error) {
    next(error);
  }
};

export const deleteActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await activityService.deleteActivity(req.params.id as string, req.user!);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.status(200).json({ message: 'Activity deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateActivities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids, update } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids array is required' });
    }
    const count = await activityService.bulkUpdateActivities(ids, update, req.user!);
    res.status(200).json({ message: `Updated ${count} activities`, count });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteActivities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids array is required' });
    }
    const count = await activityService.bulkDeleteActivities(ids, req.user!);
    res.status(200).json({ message: `Deleted ${count} activities`, count });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteActivitiesStream = async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids must be a non-empty array' });
  }

  await runStreamJob(req, res, async ({ emit, isCancelled }) => {
    emit({ type: 'info', step: 'start', message: `Deleting ${ids.length} changelog ${ids.length !== 1 ? 'entries' : 'entry'}...` });
    let deleted = 0;
    const errors: string[] = [];
    let cancelled = false;

    for (let i = 0; i < ids.length; i++) {
      if (isCancelled()) { cancelled = true; break; }
      const id = ids[i];
      const ctx = { itemIndex: i + 1, totalItems: ids.length };
      try {
        const activity = await activityService.deleteActivity(id, req.user!);
        if (activity) {
          deleted++;
          emit({ ...ctx, type: 'success', step: 'delete', label: activity.title, message: `✓ Deleted "${activity.title}" & its media` });
        } else {
          errors.push(`${id}: not found`);
          emit({ ...ctx, type: 'warn', step: 'delete', message: `Entry not found` });
        }
      } catch (err: any) {
        errors.push(`${id}: ${err.message}`);
        emit({ ...ctx, type: 'error', step: 'delete', message: `✗ Failed: ${err.message}` });
      }
    }

    emit({
      type: errors.length ? 'warn' : 'success',
      step: 'summary',
      message: `${cancelled ? 'Stopped' : 'Done'}: ${deleted} deleted, ${errors.length} error(s)`,
    });
    return { deleted, errors, cancelled, total: ids.length };
  });
};

export const reorderActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { displayOrder } = req.body;
    if (displayOrder === undefined || displayOrder === null) {
      return res.status(400).json({ message: 'displayOrder is required' });
    }
    const activity = await activityService.reorderActivity(req.params.id as string, displayOrder, req.user!);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.status(200).json(activity);
  } catch (error) {
    next(error);
  }
};
