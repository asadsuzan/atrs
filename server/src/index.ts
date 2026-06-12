import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './config/db';
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import productRoutes from './routes/productRoutes';
import activityRoutes from './routes/activityRoutes';
import reportRoutes from './routes/reportRoutes';
import uploadRoutes from './routes/uploadRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import versionRoutes from './routes/versionRoutes';
import { exportAllData } from './controllers/ExportController';
import rateLimit from 'express-rate-limit';

// Rate Limiting (P5 feature)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// app.use('/api', apiLimiter);

// Routes
app.use('/api/products', productRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/versions', versionRoutes);
app.get('/api/export', exportAllData);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'ATRS API is running' });
});

// Error handling
app.use(errorHandler);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
