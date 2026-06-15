import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import type { AuthUser } from '../types/auth';

export interface JwtPayload {
  sub: string;
  role: 'admin' | 'user';
  isRoot: boolean;
  name?: string;
  email?: string;
}

const MIN_SECRET_LENGTH = 32;

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

/**
 * Validates the configured JWT secret. Returns the list of problems found
 * (empty = OK). Pure-ish so it can be unit-tested by passing a secret in.
 */
export const validateJwtSecret = (secret: string | undefined): string[] => {
  const problems: string[] = [];
  if (!secret) {
    problems.push('JWT_SECRET is not set.');
    return problems;
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    problems.push(`JWT_SECRET is too short (${secret.length} chars); use at least ${MIN_SECRET_LENGTH}.`);
  }
  if (/^(changeme|secret|default|password)/i.test(secret)) {
    problems.push('JWT_SECRET looks like a placeholder value; set a strong random secret.');
  }
  return problems;
};

/**
 * Fail-fast at boot: a missing secret is always fatal; a weak secret is fatal
 * in production and a warning elsewhere.
 */
export const assertJwtSecretAtBoot = (): void => {
  const problems = validateJwtSecret(process.env.JWT_SECRET);
  if (problems.length === 0) return;

  const missing = !process.env.JWT_SECRET;
  const fatal = missing || process.env.NODE_ENV === 'production';
  const prefix = fatal ? '[server][FATAL]' : '[server][WARN]';
  for (const p of problems) console.error(`${prefix} ${p}`);

  if (fatal) {
    console.error('[server][FATAL] Refusing to start with an insecure JWT configuration.');
    process.exit(1);
  }
};

export const signToken = (user: { id: string; role: 'admin' | 'user'; isRoot: boolean; name?: string; email?: string }): string => {
  const payload: JwtPayload = {
    sub: user.id,
    role: user.role,
    isRoot: user.isRoot,
    name: user.name,
    email: user.email,
  };
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
    const user: AuthUser = {
      id: decoded.sub,
      role: decoded.role,
      isRoot: decoded.isRoot,
      name: decoded.name,
      email: decoded.email,
    };
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
    const account = await User.findById(req.user.id).select('name email status role isRoot');
    if (!account) return res.status(401).json({ message: 'Account no longer exists' });
    if (account.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active' });
    }
    // keep req.user in sync with the latest role/isRoot/name/email from DB
    req.user.role = account.role;
    req.user.isRoot = account.isRoot;
    req.user.name = account.name;
    req.user.email = account.email;
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
