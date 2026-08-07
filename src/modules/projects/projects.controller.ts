import { Request, Response, NextFunction } from 'express';
import { projectsService } from './projects.service.js';
import { sendSuccess } from '../../utils/response.js';

export class ProjectsController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const projects = await projectsService.getAll(req.query as any);
      sendSuccess({ res, data: projects });
    } catch (error) {
      next(error);
    }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const project = await projectsService.getBySlug(slug);
      sendSuccess({ res, data: project });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectsService.create(req.body);
      sendSuccess({ res, statusCode: 201, message: 'Project created', data: project });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const project = await projectsService.update(id, req.body);
      sendSuccess({ res, message: 'Project updated', data: project });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await projectsService.delete(id);
      sendSuccess({ res, message: 'Project soft deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const projectsController = new ProjectsController();
