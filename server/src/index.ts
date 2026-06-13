import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './config/db';
import { errorHandler } from './middlewares/errorHandler';
import { requireAuth, requireActive, requireAdmin } from './middlewares/auth';
import { seedAndMigrate } from './scripts/seedAndMigrate';

const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });
console.log(`[server]: Loading .env from ${envPath}`);
if (result.error) {
  console.error('[server]: Dotenv parsing error:', result.error);
} else {
  console.log('[server]: Injected env keys:', Object.keys(result.parsed || {}));
}

const app: Express = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Connect to MongoDB, then ensure the root admin exists and back-fill ownership.
connectDB().then(() => {
  seedAndMigrate().catch((err) => console.error('[server]: seedAndMigrate failed:', err));
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

app.listen(port, '0.0.0.0', () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
