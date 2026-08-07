import { Router, Request, Response, NextFunction } from 'express';
import { experiencesService } from './experiences.service.js';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await experiencesService.getAll();
    sendSuccess({ res, data });
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await experiencesService.create(req.body);
    sendSuccess({ res, statusCode: 201, message: 'Experience added', data });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await experiencesService.update(id, req.body);
    sendSuccess({ res, message: 'Experience updated', data });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await experiencesService.delete(id);
    sendSuccess({ res, message: 'Experience deleted' });
  } catch (err) { next(err); }
});

export const experiencesRouter = router;
