import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { z } from 'zod';

const router = Router();

const trackSchema = z.object({
  visitorId: z.string().min(1, 'Visitor ID is required'),
  url: z.string().min(1, 'URL is required'),
  path: z.string().min(1, 'Path is required'),
  title: z.string().optional(),
  referrer: z.string().optional(),
  language: z.string().optional(),
  screenSize: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

router.post('/track', (req, res, next) => {
  const result = trackSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.issues });
  }
  analyticsController.track(req, res, next);
});

router.get('/summary', authenticate, (req, res, next) => analyticsController.getSummary(req, res, next));
router.get('/retention', authenticate, (req, res, next) => analyticsController.getRetention(req, res, next));
router.get('/breakdowns', authenticate, (req, res, next) => analyticsController.getBreakdowns(req, res, next));

export const analyticsRouter = router;
