import { FeatureRequest, IFeatureRequest } from '../models/FeatureRequest';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { notificationManager } from './NotificationManager';
import { AuditLogService } from './AuditLogService';
import createHttpError from '../utils/httpError';
import type { AuthUser } from '../types/auth';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  planned: 'Planned',
  'in-progress': 'In progress',
  done: 'Done',
  declined: 'Declined',
};

export class FeatureRequestService {
  private auditLogService = new AuditLogService();

  /** Persists a notification for one user and pushes it live over SSE. */
  private async notify(userId: string, title: string, message: string, link: string) {
    try {
      const notif = new Notification({ userId, type: 'system', title, message, link });
      await notif.save();
      notificationManager.sendToUser(userId, 'notification', notif);
    } catch (error) {
      // Notifications must never break the underlying operation.
      console.error('Failed to send feature-request notification:', error);
    }
  }

  public async createRequest(
    data: { title: string; description?: string },
    user: AuthUser
  ): Promise<IFeatureRequest> {
    const request = await FeatureRequest.create({
      requesterId: user.id,
      title: data.title,
      description: data.description || '',
      status: 'pending',
    });

    await this.auditLogService.logEvent(
      'CREATE',
      'FEATURE_REQUEST',
      request._id.toString(),
      request.title,
      'Feature request submitted',
      { id: user.id, name: user.name }
    );

    // Alert every admin (persistent + live), mirroring new-user registrations.
    const admins = await User.find({ $or: [{ role: 'admin' }, { isRoot: true }] });
    for (const admin of admins) {
      // Admins submitting their own request don't need to be told about it.
      if (admin._id.toString() === user.id) continue;
      await this.notify(
        admin._id.toString(),
        'New Feature Request',
        `${user.name || 'A user'} requested: "${request.title}"`,
        '/feature-requests'
      );
    }

    return request;
  }

  /** Requesters see their own requests; admins see everyone's. */
  public async getRequests(user: AuthUser): Promise<IFeatureRequest[]> {
    const filter = user.role === 'admin' ? {} : { requesterId: user.id };
    return FeatureRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('requesterId', 'name email');
  }

  public async updateRequest(
    id: string,
    data: { title?: string; description?: string; status?: string; adminNote?: string },
    user: AuthUser
  ): Promise<IFeatureRequest | null> {
    const request = await FeatureRequest.findById(id);
    if (!request) return null;

    const isAdmin = user.role === 'admin';
    const isRequester = request.requesterId.toString() === user.id;
    // Non-owners get the same 404 as a missing id, so ids can't be probed.
    if (!isAdmin && !isRequester) return null;

    const changes: string[] = [];

    // Requesters may reword their request only while it's still pending.
    if (data.title !== undefined || data.description !== undefined) {
      if (!isAdmin && request.status !== 'pending') {
        throw createHttpError(400, 'Only pending requests can be edited.');
      }
      if (data.title !== undefined && data.title !== request.title) {
        request.title = data.title;
        changes.push('title');
      }
      if (data.description !== undefined && data.description !== request.description) {
        request.description = data.description;
        changes.push('description');
      }
    }

    // Status and the response note are admin-only triage fields.
    const previousStatus = request.status;
    if (data.status !== undefined && data.status !== request.status) {
      if (!isAdmin) throw createHttpError(403, 'Only admins can change the status.');
      request.status = data.status as IFeatureRequest['status'];
      changes.push(`status: ${previousStatus} → ${data.status}`);
    }
    if (data.adminNote !== undefined && data.adminNote !== request.adminNote) {
      if (!isAdmin) throw createHttpError(403, 'Only admins can add a response note.');
      request.adminNote = data.adminNote;
      changes.push('response note');
    }

    if (changes.length === 0) return request;
    await request.save();

    await this.auditLogService.logEvent(
      'UPDATE',
      'FEATURE_REQUEST',
      request._id.toString(),
      request.title,
      `Updated ${changes.join(', ')}`,
      { id: user.id, name: user.name }
    );

    // Tell the requester when an admin triages their request.
    const statusChanged = request.status !== previousStatus;
    if (isAdmin && !isRequester && (statusChanged || changes.includes('response note'))) {
      const statusLabel = STATUS_LABELS[request.status] || request.status;
      await this.notify(
        request.requesterId.toString(),
        'Feature Request Update',
        statusChanged
          ? `Your request "${request.title}" is now ${statusLabel}.`
          : `An admin responded to your request "${request.title}".`,
        '/feature-requests'
      );
    }

    return request;
  }

  public async deleteRequest(id: string, user: AuthUser): Promise<IFeatureRequest | null> {
    const request = await FeatureRequest.findById(id);
    if (!request) return null;

    const isAdmin = user.role === 'admin';
    const isRequester = request.requesterId.toString() === user.id;
    if (!isAdmin && !isRequester) return null;
    // Once triaged, a request is part of the roadmap record — only admins remove it.
    if (!isAdmin && request.status !== 'pending') {
      throw createHttpError(400, 'Only pending requests can be withdrawn.');
    }

    await request.deleteOne();

    await this.auditLogService.logEvent(
      'DELETE',
      'FEATURE_REQUEST',
      request._id.toString(),
      request.title,
      isRequester ? 'Feature request withdrawn' : 'Feature request deleted',
      { id: user.id, name: user.name }
    );

    return request;
  }
}
