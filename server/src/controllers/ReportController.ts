import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/ReportService';

const reportService = new ReportService();

export const getMonthlyReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, year, productId, startDate, endDate, ownerId } = req.query;

    // Support custom date range OR month/year
    if (startDate && endDate) {
      const report = await reportService.getMonthlyReport(
        0, 0,
        req.user!,
        productId as string,
        startDate as string,
        endDate as string,
        ownerId as string
      );
      return res.status(200).json(report);
    }

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year (or startDate and endDate) are required' });
    }

    const report = await reportService.getMonthlyReport(
      parseInt(month as string, 10),
      parseInt(year as string, 10),
      req.user!,
      productId as string,
      undefined,
      undefined,
      ownerId as string
    );
    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};

export const getTrend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
    const productId = req.query.productId as string | undefined;
    const data = await reportService.getTrendData(months, req.user!, productId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

export const getAnnual = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const productId = req.query.productId as string | undefined;
    const ownerId = req.query.ownerId as string | undefined;
    const data = await reportService.getAnnualReport(year, req.user!, productId, ownerId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
