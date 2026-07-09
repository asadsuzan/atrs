import bcrypt from 'bcryptjs';
import { User, hashPassword } from '../models/User';
import { signToken } from '../middlewares/auth';

// A precomputed hash of a random string. When the email is unknown we still run
// a bcrypt.compare against this so the login path costs roughly the same
// whether or not the account exists (mitigates timing-based user enumeration).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing-equalization', 10);
import createHttpError from '../utils/httpError';
import { notificationManager } from './NotificationManager';
import { Notification } from '../models/Notification';

export class AuthService {
  /** Self-registration. New accounts start as `pending` and require admin approval. */
  async register(data: { name: string; email: string; password: string }) {
    const email = data.email.toLowerCase().trim();
    const existing = await User.findOne({ email });
    if (existing) {
      throw createHttpError(409, 'An account with this email already exists');
    }
    const passwordHash = await hashPassword(data.password);
    const user = await User.create({
      name: data.name.trim(),
      email,
      passwordHash,
      role: 'user',
      status: 'pending',
      isRoot: false,
    });

    // Notify all admins about the new registration
    const admins = await User.find({ $or: [{ role: 'admin' }, { isRoot: true }] });
    for (const admin of admins) {
      const notif = new Notification({
        userId: admin._id,
        type: 'system',
        title: 'New User Registration',
        message: `${data.name} (${email}) has signed up and is waiting for approval.`,
        link: '/users'
      });
      await notif.save();
      notificationManager.sendToUser(admin._id.toString(), 'notification', notif);
    }

    return user.toJSON();
  }

  async login(data: { email: string; password: string }) {
    const email = data.email.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user) {
      // Spend the same bcrypt time as a real comparison so an attacker can't
      // distinguish "no such account" from "wrong password" by latency.
      await bcrypt.compare(data.password, DUMMY_HASH);
      throw createHttpError(401, 'Invalid email or password');
    }
    const ok = await user.comparePassword(data.password);
    if (!ok) {
      throw createHttpError(401, 'Invalid email or password');
    }
    if (user.status === 'pending') {
      throw createHttpError(403, 'Your account is awaiting administrator approval');
    }
    if (user.status === 'suspended') {
      throw createHttpError(403, 'Your account has been disabled');
    }
    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      isRoot: user.isRoot,
      name: user.name,
      email: user.email,
    });
    return { token, user: user.toJSON() };
  }

  async me(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw createHttpError(404, 'User not found');
    return user.toJSON();
  }

  /** Self-service profile update (display name + presenter job title). */
  async updateMe(userId: string, data: { name?: string; jobTitle?: string }) {
    const update: Record<string, string> = {};
    if (typeof data.name === 'string' && data.name.trim()) update.name = data.name.trim();
    if (typeof data.jobTitle === 'string') update.jobTitle = data.jobTitle.trim();
    const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
    if (!user) throw createHttpError(404, 'User not found');
    return user.toJSON();
  }

  /** Looks up whether an account exists for an email (used by the forgot-password flow). */
  async checkEmail(rawEmail: string) {
    const email = rawEmail.toLowerCase().trim();
    const user = await User.findOne({ email }).select('name isRoot');
    if (!user) return { exists: false };
    return { exists: true, name: user.name };
  }

  /**
   * Records a user's request for an admin to reset their password and notifies
   * connected admins. Always resolves the same way so the endpoint can't be
   * used to probe which accounts have already requested a reset.
   */
  async requestPasswordReset(rawEmail: string) {
    const email = rawEmail.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (user && !user.isRoot) {
      user.passwordResetRequested = true;
      user.passwordResetRequestedAt = new Date();
      await user.save();

      notificationManager.sendToAdmins('password-reset-request', {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        requestedAt: user.passwordResetRequestedAt,
      });
    }
    return { requested: true };
  }

  /** Lets an authenticated user set a new password after verifying their current one. */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId);
    if (!user) throw createHttpError(404, 'User not found');

    const ok = await user.comparePassword(currentPassword);
    if (!ok) throw createHttpError(400, 'Current password is incorrect');

    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false; // one-time password has now been replaced
    user.passwordChangedAt = new Date(); // invalidates JWTs issued before now
    await user.save();

    // Issue a fresh token so the user who just changed their own password stays
    // signed in, while any previously issued tokens are rejected by requireActive.
    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      isRoot: user.isRoot,
      name: user.name,
      email: user.email,
    });
    return { success: true, token };
  }
}
