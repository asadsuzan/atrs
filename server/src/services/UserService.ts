import { User, UserRole, UserStatus } from '../models/User';
import { Product } from '../models/Product';
import { Activity } from '../models/Activity';
import { Version } from '../models/Version';
import { ProductMarketing } from '../models/ProductMarketing';
import createHttpError from '../utils/httpError';
import { notificationManager } from './NotificationManager';
import { ProductService } from './ProductService';
import { ActivityService } from './ActivityService';
import { deleteMediaFiles } from '../utils/fileUtils';
import type { StreamEvent } from '../utils/sseStream';
import type { AuthUser } from '../types/auth';

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
    const oldStatus = user.status;
    user.status = status;
    await user.save();

    if (oldStatus !== status) {
      notificationManager.sendToUser(id, 'access-change', {
        userId: id,
        status: status,
        message: status === 'active'
          ? 'Your registration has been approved and activated. You now have full access.'
          : 'Your account access has been suspended by an administrator.',
      });
    }

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
    const oldRole = user.role;
    user.role = role;
    await user.save();

    if (oldRole !== role) {
      notificationManager.sendToUser(id, 'access-change', {
        userId: id,
        role: role,
        message: `Your account role has been updated to ${role} by an administrator.`,
      });
    }

    return user.toJSON();
  }

  async deleteUser(id: string) {
    const user = await this.getEditableUser(id);
    await user.deleteOne();
    return { id };
  }

  /**
   * Streaming cascade delete: removes every product the user owns (each with
   * its activities, versions, marketing and uploaded assets), then any orphaned
   * activities/versions/marketing still tagged to them, then the account
   * itself. Emits progress so the admin sees each step in the live console.
   */
  async deleteUserCascade(
    id: string,
    actingUser: AuthUser,
    ctx: { emit: (e: StreamEvent) => void; isCancelled: () => boolean }
  ) {
    const { emit, isCancelled } = ctx;
    const target = await this.getEditableUser(id); // throws on root / not-found

    emit({ type: 'info', step: 'start', message: `Deleting "${target.name}" and all of their data...` });

    const productService = new ProductService();
    const products = await Product.find({ ownerId: id }, 'name').lean();
    emit({ type: 'info', step: 'scan', message: `Found ${products.length} product(s) owned by this user` });

    let productsDeleted = 0;
    const errors: string[] = [];
    let cancelled = false;

    for (let i = 0; i < products.length; i++) {
      if (isCancelled()) { cancelled = true; break; }
      const p = products[i] as any;
      const pctx = { itemIndex: i + 1, totalItems: products.length };
      try {
        const counts = await productService.getCascadeCounts(p._id.toString());
        emit({ ...pctx, type: 'info', step: 'product', message: `Removing "${p.name}" + ${counts.activities} activities, ${counts.versions} versions, ${counts.marketing} marketing & assets...` });
        await productService.deleteProduct(p._id.toString(), actingUser);
        productsDeleted++;
        emit({ ...pctx, type: 'success', step: 'product', label: p.name, message: `✓ Removed "${p.name}"` });
      } catch (err: any) {
        errors.push(`${p.name}: ${err.message}`);
        emit({ ...pctx, type: 'error', step: 'product', message: `✗ Failed "${p.name}": ${err.message}` });
      }
    }

    if (!cancelled) {
      // Any activities still tagged to this user (e.g. product already gone).
      const orphanActs = await Activity.find({ ownerId: id }, '_id').lean();
      if (orphanActs.length > 0) {
        emit({ type: 'info', step: 'orphans', message: `Removing ${orphanActs.length} orphaned activit${orphanActs.length !== 1 ? 'ies' : 'y'} & media...` });
        const activityService = new ActivityService();
        await activityService.bulkDeleteActivities(orphanActs.map((a: any) => a._id.toString()), actingUser);
        emit({ type: 'success', step: 'orphans', message: `✓ Removed orphaned activities` });
      }

      // Orphaned marketing docs: clean their media files, then the docs.
      const orphanMkt = await ProductMarketing.find(
        { ownerId: id },
        'trailerVideo tutorialVideo thumbnailImage keyFeatures screenshots demos'
      ).lean();
      if (orphanMkt.length > 0) {
        const urls: (string | undefined)[] = [];
        for (const m of orphanMkt as any[]) {
          urls.push(m.trailerVideo, m.tutorialVideo, m.thumbnailImage);
          m.keyFeatures?.forEach((kf: any) => urls.push(kf.mediaUrl));
          m.screenshots?.forEach((s: any) => urls.push(s.url));
          m.demos?.forEach((d: any) => urls.push(d.icon));
        }
        deleteMediaFiles(urls.filter(Boolean) as string[]);
        await ProductMarketing.deleteMany({ ownerId: id });
        emit({ type: 'success', step: 'orphans', message: `✓ Removed orphaned marketing data` });
      }

      // Orphaned version rows.
      await Version.deleteMany({ ownerId: id });

      emit({ type: 'info', step: 'user', message: `Removing user account...` });
      await target.deleteOne();
      emit({ type: 'success', step: 'user', message: `✓ User account removed` });
    }

    emit({
      type: errors.length ? 'warn' : 'success',
      step: 'summary',
      message: `${cancelled ? 'Stopped' : 'Done'}: ${productsDeleted} product(s) removed, ${errors.length} error(s)`,
    });
    return { productsDeleted, errors, cancelled };
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
