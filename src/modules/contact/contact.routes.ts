import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middlewares/auth.js';
import { notifyNewContact } from '../../socket/index.js';
import { sendContactNotificationEmail, sendVisitorAutoResponse } from '../../utils/email.js';
import { z } from 'zod';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = contactSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, errors: result.error.issues });

    const contact = await prisma.contact.create({ data: result.data });
    notifyNewContact(contact);

    // Send email notifications asynchronously without blocking HTTP response
    Promise.allSettled([
      sendContactNotificationEmail(contact),
      sendVisitorAutoResponse(contact),
    ]);

    sendSuccess({ res, statusCode: 201, message: 'Message sent successfully', data: contact });
  } catch (err) { next(err); }
});

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contacts = await prisma.contact.findMany({ orderBy: { createdAt: 'desc' } });
    sendSuccess({ res, data: contacts });
  } catch (err) { next(err); }
});

router.patch('/:id/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { isRead, isArchived, replyStatus } = req.body;
    const contact = await prisma.contact.update({
      where: { id },
      data: {
        ...(isRead !== undefined && { isRead }),
        ...(isArchived !== undefined && { isArchived }),
        ...(replyStatus !== undefined && { replyStatus }),
      },
    });
    sendSuccess({ res, message: 'Contact status updated', data: contact });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.contact.delete({ where: { id } });
    sendSuccess({ res, message: 'Contact message deleted' });
  } catch (err) { next(err); }
});

export const contactRouter = router;
