import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as AuthController from '../controllers/AuthController';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema, emailOnlySchema, changePasswordSchema, updateMeSchema } from '../schemas/auth.schema';
import { requireAuth, requireActive } from '../middlewares/auth';

const router = Router();

// Strict limiter to slow credential stuffing / brute force on the auth endpoints.
// Tighter than the global /api limiter; only counts failed attempts so a user
// logging in normally is never blocked. Applied to login/register only — /me is
// hit on every app load and stays under the global limiter.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many attempts, please try again in a few minutes.' },
});

router.post('/register', authLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.get('/me', requireAuth, AuthController.me);
router.patch('/me', requireAuth, requireActive, validate(updateMeSchema), AuthController.updateMe);

// Forgot-password flow (public, rate-limited): look up the account, then record
// a reset request that notifies admins.
router.post('/check-email', authLimiter, validate(emailOnlySchema), AuthController.checkEmail);
router.post('/password-reset-request', authLimiter, validate(emailOnlySchema), AuthController.requestPasswordReset);

// Authenticated self-service password change (also used for the forced
// one-time-password change after an admin reset).
router.post('/change-password', requireAuth, validate(changePasswordSchema), AuthController.changePassword);

export default router;
