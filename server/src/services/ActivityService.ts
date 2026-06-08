import { ActivityRepository } from '../repositories/ActivityRepository';
import { IActivity } from '../models/Activity';

export class ActivityService {
  private repository: ActivityRepository;

  constructor() {
    this.repository = new ActivityRepository();
  }

  async createActivity(data: any): Promise<IActivity> {
    return await this.repository.create(data);
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
    return await this.repository.update(id, data);
  }

  async deleteActivity(id: string): Promise<IActivity | null> {
    return await this.repository.delete(id);
  }
}
