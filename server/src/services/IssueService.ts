import { Issue, IIssue } from '../models/Issue';
import { Product } from '../models/Product';
import { AuditLogService } from './AuditLogService';
import { scopeFilter, assertOwner } from '../utils/ownership';
import type { AuthUser } from '../types/auth';

const auditLogService = new AuditLogService();

const RESOLVED_STATUSES = ['resolved', 'closed'];

export class IssueService {
  async createIssue(data: any, user: AuthUser): Promise<IIssue> {
    const product = await Product.findById(data.productId);
    assertOwner(product, user);
    // Stamp the resolution time when an issue is filed already resolved/closed.
    if (RESOLVED_STATUSES.includes(data.status) && !data.resolvedAt) {
      data.resolvedAt = new Date();
    }
    const issue = new Issue({ ...data, ownerId: product!.ownerId });
    await issue.save();
    await auditLogService.logEvent('CREATE', 'ISSUE', issue._id.toString(), issue.title, `Reported issue "${issue.title}"`, { id: user.id, name: user.name });
    return issue;
  }

  async getIssues(productId: string, user: AuthUser): Promise<IIssue[]> {
    const filter = scopeFilter(user, { productId });
    return await Issue.find(filter).sort({ createdAt: -1 });
  }

  async getIssueById(id: string, user: AuthUser): Promise<IIssue | null> {
    const issue = await Issue.findById(id);
    assertOwner(issue, user);
    return issue;
  }

  async updateIssue(id: string, data: any, user: AuthUser): Promise<IIssue | null> {
    const existing = await Issue.findById(id);
    assertOwner(existing, user);
    delete data.ownerId;
    // Keep resolvedAt in sync with the status transition.
    if (data.status) {
      const nowResolved = RESOLVED_STATUSES.includes(data.status);
      const wasResolved = RESOLVED_STATUSES.includes(existing!.status);
      if (nowResolved && !wasResolved && !data.resolvedAt) data.resolvedAt = new Date();
      if (!nowResolved && wasResolved) data.resolvedAt = null;
    }
    const issue = await Issue.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (issue) {
      await auditLogService.logEvent('UPDATE', 'ISSUE', issue._id.toString(), issue.title, `Updated issue "${issue.title}"`, { id: user.id, name: user.name });
    }
    return issue;
  }

  async deleteIssue(id: string, user: AuthUser): Promise<IIssue | null> {
    const existing = await Issue.findById(id);
    assertOwner(existing, user);
    const issue = await Issue.findByIdAndDelete(id);
    if (issue) {
      await auditLogService.logEvent('DELETE', 'ISSUE', issue._id.toString(), issue.title, `Deleted issue "${issue.title}"`, { id: user.id, name: user.name });
    }
    return issue;
  }

  /** Public (no auth): issues for a product whose owner opted in. */
  async getPublicIssues(productId: string): Promise<IIssue[]> {
    return await Issue.find({ productId }).sort({ createdAt: -1 }).lean() as unknown as IIssue[];
  }
}
