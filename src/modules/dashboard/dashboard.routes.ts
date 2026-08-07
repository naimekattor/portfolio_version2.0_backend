import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService } from '../analytics/analytics.service.js';
import { prisma } from '../../database/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.get('/summary', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await analyticsService.getSummaryMetrics();
    const retention = await analyticsService.getRetentionCohorts();
    const breakdowns = await analyticsService.getBreakdowns();

    const recentContacts = await prisma.contact.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const recentSubscribers = await prisma.newsletterSubscriber.findMany({
      take: 5,
      orderBy: { subscribedAt: 'desc' },
    });

    sendSuccess({
      res,
      data: {
        summary,
        retention,
        breakdowns,
        recentActivity: {
          contacts: recentContacts,
          subscribers: recentSubscribers,
        },
      },
    });
  } catch (err) { next(err); }
});

export const dashboardRouter = router;
