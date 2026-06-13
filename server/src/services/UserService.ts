import { User, UserRole, UserStatus } from '../models/User';
import { Product } from '../models/Product';
import { Activity } from '../models/Activity';
import { Version } from '../models/Version';
import { ProductMarketing } from '../models/ProductMarketing';
import createHttpError from '../utils/httpError';

export class UserService {
  async listUsers(query: any) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.role) filter.role = query.role;
    const users = await User.find(filter).sort({ createdAt: -1 });
    return users.map((u) => u.toJSON());
  }

  private async getEditableUser(id: string) {
    const user = await User.findById(id);
    if (!user) throw createHttpError(404, 'User not found');
    if (user.isRoot) {
      throw createHttpError(403, 'The root administrator account cannot be modified');
    }
    return user;
  }

  async setStatus(id: string, status: UserStatus) {
    const user = await this.getEditableUser(id);
    user.status = status;
    await user.save();
    return user.toJSON();
  }

  async approve(id: string) {
    return this.setStatus(id, 'active');
  }

  async suspend(id: string) {
    return this.setStatus(id, 'suspended');
  }

  async reactivate(id: string) {
    return this.setStatus(id, 'active');
  }

  async setRole(id: string, role: UserRole) {
    const user = await this.getEditableUser(id);
    user.role = role;
    await user.save();
    return user.toJSON();
  }

  async deleteUser(id: string) {
    const user = await this.getEditableUser(id);
    await user.deleteOne();
    return { id };
  }

  /** Reassign a user's owned records to another user (e.g. before deletion). */
  async reassignOwnership(fromUserId: string, toUserId: string) {
    const target = await User.findById(toUserId);
    if (!target) throw createHttpError(404, 'Target user not found');
    const filter = { ownerId: fromUserId };
    const update = { $set: { ownerId: toUserId } };
    const [products, activities, versions, marketing] = await Promise.all([
      Product.updateMany(filter, update),
      Activity.updateMany(filter, update),
      Version.updateMany(filter, update),
      ProductMarketing.updateMany(filter, update),
    ]);
    return {
      products: products.modifiedCount,
      activities: activities.modifiedCount,
      versions: versions.modifiedCount,
      marketing: marketing.modifiedCount,
    };
  }
}
