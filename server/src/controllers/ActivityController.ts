import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/ActivityService';

const activityService = new ActivityService();

export const createActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await activityService.createActivity(req.body);
    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
};

export const getActivities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activities = await activityService.getActivities(req.query);
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};

export const getActivityById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await activityService.getActivityById(req.params.id as string);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    res.status(200).json(activity);
  } catch (error) {
    next(error);
  }
};

export const updateActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await activityService.updateActivity(req.params.id as string, req.body);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    res.status(200).json(activity);
  } catch (error) {
    next(error);
  }
};

export const deleteActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await activityService.deleteActivity(req.params.id as string);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    res.status(200).json({ message: 'Activity deleted successfully' });
  } catch (error) {
    next(error);
  }
};
