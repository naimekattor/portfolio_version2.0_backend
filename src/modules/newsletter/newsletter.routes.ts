import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middlewares/auth.js';
import { notifyNewSubscriber } from '../../socket/index.js';
import { z } from 'zod';

const router = Router();

const subscribeSchema = z.object({
  email: z.string().email('Valid email required'),
});

router.post('/subscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = subscribeSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, errors: result.error.issues });

    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email: req.body.email },
      update: { status: 'ACTIVE' },
      create: { email: req.body.email },
    });

    notifyNewSubscriber(subscriber);
    sendSuccess({ res, statusCode: 201, message: 'Subscribed successfully', data: subscriber });
  } catch (err) { next(err); }
});

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({ orderBy: { subscribedAt: 'desc' } });
    sendSuccess({ res, data: subscribers });
  } catch (err) { next(err); }
});

router.get('/export-csv', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({ where: { status: 'ACTIVE' } });
    let csv = 'Email,Status,SubscribedAt\n';
    subscribers.forEach((s) => {
      csv += `"${s.email}","${s.status}","${s.subscribedAt.toISOString()}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
    res.status(200).send(csv);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.newsletterSubscriber.delete({ where: { id } });
    sendSuccess({ res, message: 'Subscriber removed' });
  } catch (err) { next(err); }
});

export const newsletterRouter = router;
