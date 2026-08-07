import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service.js';
import { sendSuccess } from '../../utils/response.js';

export class AnalyticsController {
  async track(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await analyticsService.trackPageView({
        ...req.body,
        ip,
        userAgent,
      });

      sendSuccess({ res, statusCode: 201, message: 'PageView tracked', data: result });
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await analyticsService.getSummaryMetrics();
      sendSuccess({ res, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async getRetention(req: Request, res: Response, next: NextFunction) {
    try {
      const retention = await analyticsService.getRetentionCohorts();
      sendSuccess({ res, data: retention });
    } catch (error) {
      next(error);
    }
  }

  async getBreakdowns(req: Request, res: Response, next: NextFunction) {
    try {
      const breakdowns = await analyticsService.getBreakdowns();
      sendSuccess({ res, data: breakdowns });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
