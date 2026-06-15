import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import mongoose from 'mongoose';
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
  .then(() => {
    seedAndMigrate().catch((err) => console.error('[server]: seedAndMigrate failed:', err));
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
const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
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
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
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

// Body parsing. Uploads go through multer, so JSON/urlencoded stay small.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

import productRoutes from './routes/productRoutes';
import activityRoutes from './routes/activityRoutes';
import reportRoutes from './routes/reportRoutes';
import uploadRoutes from './routes/uploadRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import versionRoutes from './routes/versionRoutes';
import configRoutes from './routes/configRoutes';
import mediaRoutes from './routes/mediaRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import { exportAllData } from './controllers/ExportController';

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Public auth routes (register / login / me)
app.use('/api/auth', authRoutes);

// Authenticated + active-account routes
app.use('/api/products', requireAuth, requireActive, productRoutes);
app.use('/api/activities', requireAuth, requireActive, activityRoutes);
app.use('/api/reports', requireAuth, requireActive, reportRoutes);
app.use('/api/upload', requireAuth, requireActive, uploadRoutes);
app.use('/api/media', requireAuth, requireActive, mediaRoutes);
app.use('/api/audit-logs', requireAuth, requireActive, auditLogRoutes);
app.use('/api/versions', requireAuth, requireActive, versionRoutes);

// Admin-only routes
app.use('/api/users', requireAuth, requireActive, requireAdmin, userRoutes);
app.use('/api/config', requireAuth, requireActive, requireAdmin, configRoutes);
app.get('/api/export', requireAuth, requireActive, requireAdmin, exportAllData);

app.get('/api/health', (req: Request, res: Response) => {
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
