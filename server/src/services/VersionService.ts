import { Version, IVersion } from '../models/Version';
import { Product } from '../models/Product';
import { AuditLogService } from './AuditLogService';
import { scopeFilter, assertOwner } from '../utils/ownership';
import type { AuthUser } from '../types/auth';

const auditLogService = new AuditLogService();

export class VersionService {
  async createVersion(data: any, user: AuthUser): Promise<IVersion> {
    const product = await Product.findById(data.productId);
    assertOwner(product, user);
    const version = new Version({ ...data, ownerId: product!.ownerId });
    await version.save();
    await auditLogService.logEvent('CREATE', 'VERSION', version._id.toString(), version.label, `Created version ${version.label}`, { id: user.id, name: user.name });
    return version;
  }

  async getVersions(productId: string | undefined, user: AuthUser): Promise<IVersion[]> {
    // With a productId, return that product's versions. Without one, return
    // every version the user owns and populate the product so the dashboard
    // can group and link them.
    const filter = productId ? scopeFilter(user, { productId }) : scopeFilter(user);
    const query = Version.find(filter).sort({ releasedAt: -1, createdAt: -1 });
    if (!productId) query.populate('productId', 'name slug icon');
    return await query;
  }

  async getVersionById(id: string, user: AuthUser): Promise<IVersion | null> {
    const version = await Version.findById(id);
    assertOwner(version, user);
    return version;
  }

  async updateVersion(id: string, data: any, user: AuthUser): Promise<IVersion | null> {
    const existing = await Version.findById(id);
    assertOwner(existing, user);
    delete data.ownerId;
    const version = await Version.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (version) {
      await auditLogService.logEvent('UPDATE', 'VERSION', version._id.toString(), version.label, `Updated version ${version.label}`, { id: user.id, name: user.name });
    }
    return version;
  }

  async deleteVersion(id: string, user: AuthUser): Promise<IVersion | null> {
    const existing = await Version.findById(id);
    assertOwner(existing, user);
    const version = await Version.findByIdAndDelete(id);
    if (version) {
      await auditLogService.logEvent('DELETE', 'VERSION', version._id.toString(), version.label, `Deleted version ${version.label}`, { id: user.id, name: user.name });
    }
    return version;
  }
}
