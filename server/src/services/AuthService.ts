import { User, hashPassword } from '../models/User';
import { signToken } from '../middlewares/auth';
import createHttpError from '../utils/httpError';

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
    return user.toJSON();
  }

  async login(data: { email: string; password: string }) {
    const email = data.email.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user) {
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
    });
    return { token, user: user.toJSON() };
  }

  async me(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw createHttpError(404, 'User not found');
    return user.toJSON();
  }
}
