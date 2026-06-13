import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services/AuditLogService';

const auditLogService = new AuditLogService();

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Support both simple (legacy) and filtered queries
    if (req.query.page || req.query.entityType || req.query.action || req.query.startDate || req.query.search) {
      const result = await auditLogService.getLogs(req.query, req.user!);
      return res.status(200).json(result);
    }
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const logs = await auditLogService.getRecentLogs(limit, req.user!);
    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};
