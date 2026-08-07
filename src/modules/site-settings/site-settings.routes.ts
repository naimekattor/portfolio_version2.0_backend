import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.siteSetting.findMany();
    const settingsMap: Record<string, any> = {};
    settings.forEach((s) => {
      try {
        settingsMap[s.key] = JSON.parse(s.value);
      } catch {
        settingsMap[s.key] = s.value;
      }
    });
    sendSuccess({ res, data: settingsMap });
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body; // Key-value object
    for (const [key, value] of Object.entries(settings)) {
      const valString = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value: valString },
        create: { key, value: valString },
      });
    }
    sendSuccess({ res, message: 'Settings saved successfully' });
  } catch (err) { next(err); }
});

export const siteSettingsRouter = router;
