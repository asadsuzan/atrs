import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as AuthController from '../controllers/AuthController';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { requireAuth } from '../middlewares/auth';

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

export default router;
