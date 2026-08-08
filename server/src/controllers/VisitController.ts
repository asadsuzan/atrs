import { Request, Response, NextFunction } from 'express';
import { sendVisitAlert } from '../services/VisitAlertService';

/**
 * Public, unauthenticated endpoint the client pings once per browser session
 * on first page load (see client's `services/visit.ts`) so we get a Telegram
 * alert for every visitor, whether or not they're signed in.
 *
 * Always responds 204 even if the alert fails to send — this must never
 * surface an error to a visitor's browser or block the page.
 */
export const trackVisit = async (req: Request, res: Response, _next: NextFunction) => {
  res.status(204).end();

  const forwardedFor = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : undefined) ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown';

  const { path, referrer, loggedIn } = req.body || {};

  await sendVisitAlert({
    path: typeof path === 'string' ? path.slice(0, 300) : undefined,
    referrer: typeof referrer === 'string' ? referrer.slice(0, 300) : undefined,
    loggedIn: Boolean(loggedIn),
    ip,
    userAgent: req.headers['user-agent'],
  });
};
