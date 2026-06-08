import AuditLog, { IAuditLog } from '../models/AuditLog';

export class AuditLogService {
  public async logEvent(
    action: IAuditLog['action'],
    entityType: IAuditLog['entityType'],
    entityId: string,
    entityName: string,
    details?: string
  ): Promise<void> {
    try {
      await AuditLog.create({
        action,
        entityType,
        entityId,
        entityName,
        details
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  public async getRecentLogs(limit: number = 20): Promise<IAuditLog[]> {
    return await AuditLog.find().sort({ createdAt: -1 }).limit(limit);
  }
}
