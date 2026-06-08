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
      await AuditLog.create({ action, entityType, entityId, entityName, details });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  public async getRecentLogs(limit: number = 20): Promise<IAuditLog[]> {
    return await AuditLog.find().sort({ createdAt: -1 }).limit(limit);
  }

  public async getLogs(query: any): Promise<any> {
    const filter: any = {};
    if (query.entityType) filter.entityType = query.entityType;
    if (query.action) filter.action = query.action;
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (query.search) {
      filter.$or = [
        { entityName: { $regex: query.search, $options: 'i' } },
        { details: { $regex: query.search, $options: 'i' } },
      ];
    }

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 30;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }
}
