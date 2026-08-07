import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../database/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middlewares/auth.js';
import { ApiError } from '../../utils/api-error.js';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: jpg, png, webp, svg, pdf'));
    }
  },
});

router.post('/upload', authenticate, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new ApiError(400, 'No file uploaded');

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    const outputPath = path.join(uploadDir, filename);

    if (req.file.mimetype.startsWith('image/') && !req.file.mimetype.includes('svg')) {
      await sharp(req.file.buffer)
        .webp({ quality: 80 })
        .toFile(outputPath);
    } else {
      fs.writeFileSync(outputPath, req.file.buffer);
    }

    const fileUrl = `/uploads/${filename}`;
    const media = await prisma.media.create({
      data: {
        filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        path: outputPath,
        folder: (req.body.folder as string) || 'general',
      },
    });

    sendSuccess({ res, statusCode: 201, message: 'File uploaded successfully', data: media });
  } catch (err) { next(err); }
});

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = await prisma.media.findMany({ orderBy: { createdAt: 'desc' } });
    sendSuccess({ res, data: files });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const media = await prisma.media.findUnique({ where: { id } });
    if (media && fs.existsSync(media.path)) {
      fs.unlinkSync(media.path);
    }
    await prisma.media.delete({ where: { id } });
    sendSuccess({ res, message: 'File deleted successfully' });
  } catch (err) { next(err); }
});

export const mediaRouter = router;
