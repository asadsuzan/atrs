import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import type { AuthUser } from '../types/auth';

export interface JwtPayload {
  sub: string;
  role: 'admin' | 'user';
  isRoot: boolean;
}

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

export const signToken = (user: { id: string; role: 'admin' | 'user'; isRoot: boolean }): string => {
  const payload: JwtPayload = { sub: user.id, role: user.role, isRoot: user.isRoot };
  return jwt.sign(payload, getSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
};

/** Verifies the Bearer token and attaches req.user. */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, getSecret()) as JwtPayload;
    const user: AuthUser = { id: decoded.sub, role: decoded.role, isRoot: decoded.isRoot };
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/** Ensures the authenticated user's account is still active (not suspended/deleted). */
export const requireActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const account = await User.findById(req.user.id).select('status role isRoot');
    if (!account) return res.status(401).json({ message: 'Account no longer exists' });
    if (account.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active' });
    }
    // keep req.user in sync with the latest role/isRoot from DB
    req.user.role = account.role;
    req.user.isRoot = account.isRoot;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access required' });
  }
  next();
};
