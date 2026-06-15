import type { UserRole } from '../models/User';

/** The authenticated principal attached to req.user by the auth middleware. */
export interface AuthUser {
  id: string;
  role: UserRole;
  isRoot: boolean;
  name?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
