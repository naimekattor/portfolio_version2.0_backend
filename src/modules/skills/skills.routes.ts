import { Router } from 'express';
import { skillsController } from './skills.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { z } from 'zod';

const router = Router();

const skillSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  icon: z.string().optional(),
  category: z.string().default('Frontend'),
  percentage: z.number().min(0).max(100).default(80),
  displayOrder: z.number().default(0),
});

router.get('/', (req, res, next) => skillsController.getAll(req, res, next));
router.post('/', authenticate, (req, res, next) => {
  const result = skillSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, errors: result.error.issues });
  skillsController.create(req, res, next);
});
router.put('/:id', authenticate, (req, res, next) => skillsController.update(req, res, next));
router.delete('/:id', authenticate, (req, res, next) => skillsController.delete(req, res, next));

export const skillsRouter = router;
