import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import mongoose from 'mongoose';
import { customLogger } from './middlewares/logger';
import connectDB from './config/db';
import { errorHandler } from './middlewares/errorHandler';
import { requireAuth, requireActive, requireAdmin, assertJwtSecretAtBoot } from './middlewares/auth';
import { seedAndMigrate } from './scripts/seedAndMigrate';

const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });
console.log(`[server]: Loading .env from ${envPath}`);
if (result.error) {
  console.error('[server]: Dotenv parsing error:', result.error);
}

// Fail fast if the JWT secret is missing or weak (fatal in production).
assertJwtSecretAtBoot();

const app: Express = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Connect to MongoDB, then ensure the root admin exists and back-fill ownership.
connectDB()
  .then(async () => {
    await seedAndMigrate().catch((err) => console.error('[server]: seedAndMigrate failed:', err));
    // Start the code-activity tracker once the DB is ready (no-op unless enabled
    // and some product has a repoPath).
    codeTrackerService.refresh().catch((err) => console.error('[CodeTracker] refresh failed:', err));
  })
  .catch((err) => {
    console.error('[server]: Could not establish initial MongoDB connection:', err?.message || err);
  });

// Security headers
app.use(helmet({
  // Allow cross-origin loading of static assets (uploaded images/videos)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS allow-list. CLIENT_ORIGIN is a comma-separated list of allowed origins;
// defaults to the vite dev origins. Requests with no Origin header (curl,
// server-to-server, same-origin) are always allowed.
const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://192.168.0.199:5173'];
const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(',')
    : defaultOrigins
  )
    .map((o) => o.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      // Don't throw on a disallowed (or `null`, e.g. iframe form-navigation)
      // origin — just omit the CORS headers. The browser still blocks
      // cross-origin XHR/fetch reads (no Access-Control-Allow-Origin), but
      // plain navigations like the readme-validator iframe's form POST proceed.
      return callback(null, false);
    },
    credentials: true,
  })
);

// Rate limiting on the API surface.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// HTTP request logging
app.use(customLogger);

// Body parsing. Uploads go through multer, so JSON/urlencoded stay small.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

import productRoutes from './routes/productRoutes';
import activityRoutes from './routes/activityRoutes';
import reportRoutes from './routes/reportRoutes';
import uploadRoutes from './routes/uploadRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import versionRoutes from './routes/versionRoutes';
import issueRoutes from './routes/issueRoutes';
import configRoutes from './routes/configRoutes';
import mediaRoutes from './routes/mediaRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import notificationRoutes from './routes/notificationRoutes';
import jobRoutes from './routes/jobRoutes';
import codeTrackerRoutes from './routes/codeTrackerRoutes';
import githubRoutes from './routes/githubRoutes';
import readmeToolsRoutes from './routes/readmeToolsRoutes';
import publicRoutes from './routes/publicRoutes';
import { codeTrackerService } from './services/CodeTrackerService';
import { exportAllData } from './controllers/ExportController';

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Public auth routes (register / login / me)
app.use('/api/auth', authRoutes);

// Public: reverse proxy for the WordPress.org readme validator so it can be
// embedded in an <iframe> (it blocks framing). No auth — an iframe navigation
// can't send the JWT header, and it only proxies a public page.
app.use('/api/tools', readmeToolsRoutes);

// Public: read-only endpoints for the hosted changelog page (/changelog/:id).
// No auth — owners opt a product in via its publicChangelogEnabled flag.
app.use('/api/public', publicRoutes);

// Authenticated + active-account routes
app.use('/api/products', requireAuth, requireActive, productRoutes);
app.use('/api/activities', requireAuth, requireActive, activityRoutes);
app.use('/api/reports', requireAuth, requireActive, reportRoutes);
app.use('/api/upload', requireAuth, requireActive, uploadRoutes);
app.use('/api/media', requireAuth, requireActive, mediaRoutes);
app.use('/api/audit-logs', requireAuth, requireActive, auditLogRoutes);
app.use('/api/versions', requireAuth, requireActive, versionRoutes);
app.use('/api/issues', requireAuth, requireActive, issueRoutes);
app.use('/api/jobs', requireAuth, requireActive, jobRoutes);
app.use('/api/code-tracker', requireAuth, requireActive, codeTrackerRoutes);
app.use('/api/github', requireAuth, requireActive, githubRoutes);
app.use('/api/notifications', notificationRoutes);

// Admin-only routes
app.use('/api/users', requireAuth, requireActive, requireAdmin, userRoutes);
app.use('/api/config', requireAuth, requireActive, requireAdmin, configRoutes);
app.get('/api/export', requireAuth, requireActive, requireAdmin, exportAllData);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'ATRS API is running' });
});

// Error handling
app.use(errorHandler);

const server: http.Server = app.listen(port, '0.0.0.0', () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

// Graceful shutdown: stop accepting connections, then close the DB.
const shutdown = (signal: string) => {
  console.log(`[server]: Received ${signal}, shutting down gracefully...`);
  server.close((err) => {
    if (err) {
      console.error('[server]: Error closing HTTP server:', err);
    } else {
      console.log('[server]: HTTP server closed.');
    }
    mongoose.connection
      .close(false)
      .then(() => {
        console.log('[server]: MongoDB connection closed.');
        process.exit(0);
      })
      .catch((closeErr) => {
        console.error('[server]: Error closing MongoDB connection:', closeErr);
        process.exit(1);
      });
  });

  // Force-exit if graceful close hangs.
  setTimeout(() => {
    console.error('[server]: Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
