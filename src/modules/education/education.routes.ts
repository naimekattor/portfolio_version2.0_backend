import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.education.findMany({ orderBy: { order: 'asc' } });
    sendSuccess({ res, data });
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.education.create({ data: req.body });
    sendSuccess({ res, statusCode: 201, message: 'Education record added', data });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await prisma.education.update({ where: { id }, data: req.body });
    sendSuccess({ res, message: 'Education record updated', data });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.education.delete({ where: { id } });
    sendSuccess({ res, message: 'Education record deleted' });
  } catch (err) { next(err); }
});

export const educationRouter = router;
