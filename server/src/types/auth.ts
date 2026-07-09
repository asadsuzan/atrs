import type { UserRole } from '../models/User';

/** The authenticated principal attached to req.user by the auth middleware. */
export interface AuthUser {
  id: string;
  role: UserRole;
  isRoot: boolean;
  name?: string;
  email?: string;
  /** JWT "issued at" (seconds); used to reject tokens minted before a password change. */
  iat?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
