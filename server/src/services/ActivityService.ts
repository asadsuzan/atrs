import { ActivityRepository } from '../repositories/ActivityRepository';
import { IActivity } from '../models/Activity';
import { Product } from '../models/Product';
import { AuditLogService } from './AuditLogService';
import { deleteMediaFiles } from '../utils/fileUtils';
import { scopeFilter, assertOwner } from '../utils/ownership';
import { escapeRegex } from '../utils/sanitize';
import { buildActivityBulkUpdate } from '../utils/activityBulkUpdate';
import type { AuthUser } from '../types/auth';

const auditLogService = new AuditLogService();

export class ActivityService {
  private repository: ActivityRepository;

  constructor() {
    this.repository = new ActivityRepository();
  }

  async createActivity(data: any, user: AuthUser): Promise<IActivity> {
    // The activity inherits ownership from its product; the user must own that product.
    const product = await Product.findById(data.productId);
    assertOwner(product, user);
    const activity = await this.repository.create({ ...data, ownerId: product!.ownerId });
    await auditLogService.logEvent('CREATE', 'ACTIVITY', activity._id.toString(), activity.title, `Logged a new ${activity.type}`, { id: user.id, name: user.name });
    return activity;
  }

  async getActivities(query: any, user: AuthUser): Promise<any> {
    const filter: any = scopeFilter(user);
    if (query.productId) filter.productId = query.productId;
    if (query.type) filter.type = query.type;
    if (query.tier) filter.tier = query.tier;
    if (query.tags) filter.tags = query.tags;
    if (query.priority) filter.priority = query.priority;
    if (query.versionId) filter.versionId = query.versionId;
    if (query.ownerId && user.role === 'admin') {
      filter.ownerId = query.ownerId;
    }
    if (query.search) {
      filter.title = { $regex: escapeRegex(query.search), $options: 'i' };
    }
    if (query.startDate || query.endDate) {
      filter.activityDate = {};
      if (query.startDate) filter.activityDate.$gte = new Date(query.startDate);
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

  async getActivityById(id: string, user: AuthUser): Promise<IActivity | null> {
    const activity = await this.repository.findById(id);
    assertOwner(activity, user);
    return activity;
  }

  async updateActivity(id: string, data: any, user: AuthUser): Promise<IActivity | null> {
    const oldActivity = await this.repository.findById(id);
    assertOwner(oldActivity, user);
    delete data.ownerId;
    const activity = await this.repository.update(id, data);

    if (activity) {
      await auditLogService.logEvent('UPDATE', 'ACTIVITY', activity._id.toString(), activity.title, `Updated ${activity.type}`, { id: user.id, name: user.name });

      if (oldActivity) {
        const getMediaUrls = (act: any) => {
          const urls: (string | undefined)[] = [
            act.mediaUrl,
            ...(act.mediaUrls || []),
          ];
          act.items?.forEach((item: any) => {
            urls.push(item.mediaUrl);
            if (item.mediaUrls) urls.push(...item.mediaUrls);
          });
          return urls.filter(Boolean) as string[];
        };

        const oldUrls = getMediaUrls(oldActivity);
        const newUrls = getMediaUrls(activity);

        const orphanedUrls = oldUrls.filter(url => !newUrls.includes(url));
        if (orphanedUrls.length > 0) {
          deleteMediaFiles(orphanedUrls);
        }
      }
    }
    return activity;
  }

  async deleteActivity(id: string, user: AuthUser): Promise<IActivity | null> {
    const existing = await this.repository.findById(id);
    assertOwner(existing, user);
    const activity = await this.repository.delete(id);
    if (activity) {
      await auditLogService.logEvent('DELETE', 'ACTIVITY', activity._id.toString(), activity.title, `Deleted ${activity.type}`, { id: user.id, name: user.name });

      const mediaUrls: (string | undefined)[] = [
        activity.mediaUrl,
        ...(activity.mediaUrls || []),
      ];
      activity.items?.forEach((item: any) => {
        mediaUrls.push(item.mediaUrl);
        if (item.mediaUrls) mediaUrls.push(...item.mediaUrls);
      });
      deleteMediaFiles(mediaUrls.filter(Boolean) as string[]);
    }
    return activity;
  }

  async bulkUpdateActivities(ids: string[], update: any, user: AuthUser): Promise<number> {
    // Never forward client-supplied keys/operators to the database. The update
    // document is assembled server-side from whitelisted fields only.
    const updateDoc = buildActivityBulkUpdate(update || {});
    return await this.repository.bulkUpdate(ids, updateDoc, scopeFilter(user));
  }

  async bulkDeleteActivities(ids: string[], user: AuthUser): Promise<number> {
    const scope = scopeFilter(user);
    const activities = await this.repository.findManyByIds(ids, scope);
    const ownedIds = activities.map(a => a._id.toString());
    const deletedCount = await this.repository.bulkDelete(ownedIds, scope);

    activities.forEach(activity => {
      if (!activity) return;
      const mediaUrls: (string | undefined)[] = [
        activity.mediaUrl,
        ...(activity.mediaUrls || []),
      ];
      activity.items?.forEach((item: any) => {
        mediaUrls.push(item.mediaUrl);
        if (item.mediaUrls) mediaUrls.push(...item.mediaUrls);
      });
      deleteMediaFiles(mediaUrls.filter(Boolean) as string[]);
    });

    return deletedCount;
  }

  async reorderActivity(id: string, displayOrder: number, user: AuthUser): Promise<IActivity | null> {
    const existing = await this.repository.findById(id);
    assertOwner(existing, user);
    return await this.repository.reorder(id, displayOrder);
  }
}
