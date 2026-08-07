import { Router, Request, Response, NextFunction } from 'express';
import { blogsService } from './blogs.service.js';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await blogsService.getAll(req.query as any);
    sendSuccess({ res, data });
  } catch (err) { next(err); }
});

router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug as string;
    const data = await blogsService.getBySlug(slug);
    sendSuccess({ res, data });
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await blogsService.create(req.body);
    sendSuccess({ res, statusCode: 201, message: 'Blog created', data });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await blogsService.update(id, req.body);
    sendSuccess({ res, message: 'Blog updated', data });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await blogsService.delete(id);
    sendSuccess({ res, message: 'Blog soft deleted' });
  } catch (err) { next(err); }
});

export const blogsRouter = router;
