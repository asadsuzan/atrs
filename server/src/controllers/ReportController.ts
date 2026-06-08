import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/ReportService';

const reportService = new ReportService();

export const getMonthlyReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, year, productId } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    const report = await reportService.getMonthlyReport(
      parseInt(month as string, 10),
      parseInt(year as string, 10),
      productId as string
    );

    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};
