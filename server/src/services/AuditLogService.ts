import AuditLog, { IAuditLog } from '../models/AuditLog';
import { escapeRegex } from '../utils/sanitize';
import type { AuthUser } from '../types/auth';

export class AuditLogService {
  public async logEvent(
    action: IAuditLog['action'],
    entityType: IAuditLog['entityType'],
    entityId: string,
    entityName: string,
    details?: string,
    actor?: { id: string; name?: string }
  ): Promise<void> {
    try {
      await AuditLog.create({
        action,
        entityType,
        entityId,
        entityName,
        details,
        userId: actor?.id,
        userName: actor?.name,
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /** Non-admins only see their own actions. */
  private scope(user?: AuthUser): Record<string, any> {
    if (!user) return { userId: null };
    if (user.role === 'admin') return {};
    return { userId: user.id };
  }

  public async getRecentLogs(limit: number = 20, user?: AuthUser): Promise<IAuditLog[]> {
    return await AuditLog.find(this.scope(user))
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'name email');
  }

  public async getLogs(query: any, user?: AuthUser): Promise<any> {
    const filter: any = { ...this.scope(user) };
    if (query.entityType) filter.entityType = query.entityType;
    if (query.action) filter.action = query.action;
    // Admin-only: filter by a specific user's actions.
    if (query.userId && user?.role === 'admin') {
      filter.userId = query.userId;
    }
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
      const safe = escapeRegex(query.search);
      filter.$or = [
        { entityName: { $regex: safe, $options: 'i' } },
        { details: { $regex: safe, $options: 'i' } },
      ];
    }

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 30;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email'),
      AuditLog.countDocuments(filter),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }
}
