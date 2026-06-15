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
    return await Activity.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async delete(id: string): Promise<IActivity | null> {
    return await Activity.findByIdAndDelete(id);
  }

  async findManyByIds(ids: string[], scope: Record<string, any> = {}): Promise<IActivity[]> {
    return await Activity.find({ _id: { $in: ids }, ...scope });
  }

  // Defense-in-depth: even though the service builds the update document, the
  // repository refuses any update that uses an operator outside this allow-list.
  private static readonly ALLOWED_BULK_OPERATORS = new Set(['$set', '$addToSet', '$pull']);

  async bulkUpdate(ids: string[], update: any, scope: Record<string, any> = {}): Promise<number> {
    const keys = Object.keys(update || {});
    const invalid = keys.filter((k) => !ActivityRepository.ALLOWED_BULK_OPERATORS.has(k));
    if (keys.length === 0 || invalid.length > 0) {
      throw new Error(`Disallowed bulk update operator(s): ${invalid.join(', ') || '(empty)'}`);
    }
    const result = await Activity.updateMany(
      { _id: { $in: ids }, ...scope },
      update,
      { runValidators: true }
    );
    return result.modifiedCount;
  }

  async bulkDelete(ids: string[], scope: Record<string, any> = {}): Promise<number> {
    const result = await Activity.deleteMany({ _id: { $in: ids }, ...scope });
    return result.deletedCount;
  }

  async reorder(id: string, displayOrder: number): Promise<IActivity | null> {
    return await Activity.findByIdAndUpdate(id, { displayOrder }, { new: true });
  }
}
