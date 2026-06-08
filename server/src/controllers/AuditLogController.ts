import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services/AuditLogService';

const auditLogService = new AuditLogService();

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const logs = await auditLogService.getRecentLogs(limit);
    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};
