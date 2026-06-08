import { ActivityRepository } from '../repositories/ActivityRepository';
import { IActivity } from '../models/Activity';
import { AuditLogService } from './AuditLogService';

const auditLogService = new AuditLogService();

export class ActivityService {
  private repository: ActivityRepository;

  constructor() {
    this.repository = new ActivityRepository();
  }

  async createActivity(data: any): Promise<IActivity> {
    const activity = await this.repository.create(data);
    await auditLogService.logEvent('CREATE', 'ACTIVITY', activity._id.toString(), activity.title, `Logged a new ${activity.type}`);
    return activity;
  }

  async getActivities(query: any): Promise<any> {
    const filter: any = {};
    if (query.productId) {
      filter.productId = query.productId;
    }
    if (query.type) {
      filter.type = query.type;
    }
    if (query.tier) {
      filter.tier = query.tier;
    }
    if (query.tags) {
      filter.tags = query.tags;
    }
    if (query.startDate || query.endDate) {
      filter.activityDate = {};
      if (query.startDate) {
        filter.activityDate.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.activityDate.$lte = end;
      }
    }
    
    const options = {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10,
      sortBy: query.sortBy || 'activityDate',
      sortOrder: query.sortOrder || 'desc'
    };
    
    return await this.repository.findAll(filter, options);
  }

  async getActivityById(id: string): Promise<IActivity | null> {
    return await this.repository.findById(id);
  }

  async updateActivity(id: string, data: any): Promise<IActivity | null> {
    const activity = await this.repository.update(id, data);
    if (activity) {
      await auditLogService.logEvent('UPDATE', 'ACTIVITY', activity._id.toString(), activity.title, `Updated ${activity.type}`);
    }
    return activity;
  }

  async deleteActivity(id: string): Promise<IActivity | null> {
    const activity = await this.repository.delete(id);
    if (activity) {
      await auditLogService.logEvent('DELETE', 'ACTIVITY', activity._id.toString(), activity.title, `Deleted ${activity.type}`);
    }
    return activity;
  }
}
