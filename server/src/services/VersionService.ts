import { Version, IVersion } from '../models/Version';
import { AuditLogService } from './AuditLogService';

const auditLogService = new AuditLogService();

export class VersionService {
  async createVersion(data: any): Promise<IVersion> {
    const version = new Version(data);
    await version.save();
    await auditLogService.logEvent('CREATE', 'PRODUCT', version.productId.toString(), version.label, `Created version ${version.label}`);
    return version;
  }

  async getVersions(productId: string): Promise<IVersion[]> {
    return await Version.find({ productId }).sort({ releasedAt: -1, createdAt: -1 });
  }

  async getVersionById(id: string): Promise<IVersion | null> {
    return await Version.findById(id);
  }

  async updateVersion(id: string, data: any): Promise<IVersion | null> {
    const version = await Version.findByIdAndUpdate(id, data, { new: true });
    if (version) {
      await auditLogService.logEvent('UPDATE', 'PRODUCT', version.productId.toString(), version.label, `Updated version ${version.label}`);
    }
    return version;
  }

  async deleteVersion(id: string): Promise<IVersion | null> {
    const version = await Version.findByIdAndDelete(id);
    if (version) {
      await auditLogService.logEvent('DELETE', 'PRODUCT', version.productId.toString(), version.label, `Deleted version ${version.label}`);
    }
    return version;
  }
}
