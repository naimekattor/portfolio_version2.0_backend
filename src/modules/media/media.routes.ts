import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../database/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middlewares/auth.js';
import { ApiError } from '../../utils/api-error.js';
import { isCloudinaryReady, uploadStreamToCloudinary, deleteFromCloudinary } from '../../utils/cloudinary.js';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: jpg, png, webp, svg, gif, pdf'));
    }
  },
});

// Check if Cloudinary is configured
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      cloudinaryConfigured: isCloudinaryReady(),
    },
  });
});

// Explicit Cloudinary Upload endpoint
router.post('/upload-cloudinary', authenticate, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new ApiError(400, 'No file uploaded');

    if (!isCloudinaryReady()) {
      throw new ApiError(
        400,
        'Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) to backend/.env'
      );
    }

    const folder = (req.body.folder as string) || 'portfolio/projects';
    const result = await uploadStreamToCloudinary(req.file.buffer, folder);

    const media = await prisma.media.create({
      data: {
        filename: result.publicId,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: result.bytes || req.file.size,
        url: result.secureUrl,
        path: result.publicId,
        folder,
      },
    });

    sendSuccess({
      res,
      statusCode: 201,
      message: 'Image uploaded to Cloudinary successfully',
      data: {
        url: result.secureUrl,
        publicId: result.publicId,
        media,
      },
    });
  } catch (err) {
    next(err);
  }
});

// General Upload: Uses Cloudinary if available, otherwise local disk
router.post('/upload', authenticate, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new ApiError(400, 'No file uploaded');

    const folder = (req.body.folder as string) || 'portfolio';

    // If Cloudinary is configured, prefer Cloudinary
    if (isCloudinaryReady()) {
      const result = await uploadStreamToCloudinary(req.file.buffer, folder);

      const media = await prisma.media.create({
        data: {
          filename: result.publicId,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: result.bytes || req.file.size,
          url: result.secureUrl,
          path: result.publicId,
          folder,
        },
      });

      return sendSuccess({
        res,
        statusCode: 201,
        message: 'File uploaded to Cloudinary successfully',
        data: {
          url: result.secureUrl,
          media,
        },
      });
    }

    // Fallback: Local disk storage
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    const outputPath = path.join(uploadDir, filename);

    if (req.file.mimetype.startsWith('image/') && !req.file.mimetype.includes('svg')) {
      await sharp(req.file.buffer).webp({ quality: 85 }).toFile(outputPath);
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
        folder,
      },
    });

    sendSuccess({ res, statusCode: 201, message: 'File uploaded to local storage successfully', data: { url: fileUrl, media } });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = await prisma.media.findMany({ orderBy: { createdAt: 'desc' } });
    sendSuccess({ res, data: files });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const media = await prisma.media.findUnique({ where: { id } });
    if (media) {
      if (media.url.includes('cloudinary.com') || (media.path && !media.path.includes('\\') && !media.path.includes('/'))) {
        await deleteFromCloudinary(media.path);
      } else if (fs.existsSync(media.path)) {
        fs.unlinkSync(media.path);
      }
      await prisma.media.delete({ where: { id } });
    }
    sendSuccess({ res, message: 'File deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export const mediaRouter = router;
