import { Activity, IActivity } from '../models/Activity';

export class ActivityRepository {
  async create(data: Partial<IActivity>): Promise<IActivity> {
    const activity = new Activity(data);
    return await activity.save();
  }

  async findAll(filter: any, options: any = {}): Promise<any> {
    const { page = 1, limit = 10, sortBy = 'activityDate', sortOrder = 'desc' } = options;
    const sortObj: any = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    if (limit === -1) {
      const data = await Activity.find(filter).sort(sortObj).populate('productId', 'name slug icon category status').populate('versionId', 'label');
      return { data, total: data.length, page: 1, totalPages: 1 };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Activity.find(filter).sort(sortObj).skip(skip).limit(limit).populate('productId', 'name slug icon category status').populate('versionId', 'label'),
      Activity.countDocuments(filter)
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<IActivity | null> {
    return await Activity.findById(id).populate('productId', 'name slug icon category status').populate('versionId', 'label');
  }

  async update(id: string, data: Partial<IActivity>): Promise<IActivity | null> {
    return await Activity.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<IActivity | null> {
    return await Activity.findByIdAndDelete(id);
  }

  async bulkUpdate(ids: string[], update: any): Promise<number> {
    const result = await Activity.updateMany({ _id: { $in: ids } }, update);
    return result.modifiedCount;
  }

  async bulkDelete(ids: string[]): Promise<number> {
    const result = await Activity.deleteMany({ _id: { $in: ids } });
    return result.deletedCount;
  }

  async reorder(id: string, displayOrder: number): Promise<IActivity | null> {
    return await Activity.findByIdAndUpdate(id, { displayOrder }, { new: true });
  }
}
