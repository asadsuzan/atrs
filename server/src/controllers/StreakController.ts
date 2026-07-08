import { Request, Response, NextFunction } from 'express';
import { StreakService } from '../services/StreakService';

const streakService = new StreakService();

/** The caller's personal logging streak (tzOffset = client getTimezoneOffset()). */
export const getLoggingStreak = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tzOffset = parseInt(String(req.query.tzOffset), 10) || 0;
    const stats = await streakService.getLoggingStreak(req.user!, tzOffset);
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

export const createDailyLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const log = await streakService.logToday(req.body.note, req.user!);
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
};

export const deleteDailyLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const log = await streakService.deleteLog(req.params.id as string, req.user!);
    if (!log) return res.status(404).json({ message: 'Note not found' });
    res.status(200).json({ message: 'Note deleted' });
  } catch (error) {
    next(error);
  }
};
