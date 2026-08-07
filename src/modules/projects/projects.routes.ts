import { Router } from 'express';
import { projectsController } from './projects.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { z } from 'zod';

const router = Router();

const projectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  impact: z.string().optional(),
  technologies: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  githubUrl: z.string().optional(),
  liveUrl: z.string().optional(),
  category: z.string().default('Web App'),
  featured: z.boolean().default(false),
  order: z.number().default(0),
});

router.get('/', (req, res, next) => projectsController.getAll(req, res, next));
router.get('/:slug', (req, res, next) => projectsController.getBySlug(req, res, next));

router.post('/', authenticate, (req, res, next) => {
  const result = projectSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, errors: result.error.issues });
  projectsController.create(req, res, next);
});

router.put('/:id', authenticate, (req, res, next) => projectsController.update(req, res, next));
router.delete('/:id', authenticate, (req, res, next) => projectsController.delete(req, res, next));

export const projectsRouter = router;
