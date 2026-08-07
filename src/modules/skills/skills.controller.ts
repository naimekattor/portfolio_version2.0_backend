import { Request, Response, NextFunction } from 'express';
import { skillsService } from './skills.service.js';
import { sendSuccess } from '../../utils/response.js';

export class SkillsController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const skills = await skillsService.getAll();
      sendSuccess({ res, data: skills });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const skill = await skillsService.create(req.body);
      sendSuccess({ res, statusCode: 201, message: 'Skill created', data: skill });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const skill = await skillsService.update(id, req.body);
      sendSuccess({ res, message: 'Skill updated', data: skill });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await skillsService.delete(id);
      sendSuccess({ res, message: 'Skill deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const skillsController = new SkillsController();
