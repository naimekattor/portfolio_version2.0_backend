import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

import { env } from './config/env.js';
import { errorHandler } from './middlewares/error.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { projectsRouter } from './modules/projects/projects.routes.js';
import { skillsRouter } from './modules/skills/skills.routes.js';
import { experiencesRouter } from './modules/experiences/experiences.routes.js';
import { educationRouter } from './modules/education/education.routes.js';
import { certificatesRouter } from './modules/certificates/certificates.routes.js';
import { blogsRouter } from './modules/blogs/blogs.routes.js';
import { contactRouter } from './modules/contact/contact.routes.js';
import { newsletterRouter } from './modules/newsletter/newsletter.routes.js';
import { mediaRouter } from './modules/media/media.routes.js';
import { siteSettingsRouter } from './modules/site-settings/site-settings.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';

export function createApp(): Express {
  const app = express();

  // Security & Utility Middlewares
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin: [env.CORS_ORIGIN, 'http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    })
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api/', limiter);

  // Static uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Swagger Documentation Setup
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Portfolio Backend API',
        version: '1.0.0',
        description: 'Production Express.js API with Prisma, Analytics, and Auth',
      },
      servers: [{ url: `http://localhost:${env.PORT}/api/v1` }],
    },
    apis: ['./src/modules/**/*.routes.ts'],
  };
  const swaggerSpec = swaggerJSDoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
  });

  // API v1 Routes
  const apiV1 = express.Router();
  apiV1.use('/auth', authRouter);
  apiV1.use('/analytics', analyticsRouter);
  apiV1.use('/dashboard', dashboardRouter);
  apiV1.use('/projects', projectsRouter);
  apiV1.use('/skills', skillsRouter);
  apiV1.use('/experiences', experiencesRouter);
  apiV1.use('/education', educationRouter);
  apiV1.use('/certificates', certificatesRouter);
  apiV1.use('/blogs', blogsRouter);
  apiV1.use('/contact', contactRouter);
  apiV1.use('/newsletter', newsletterRouter);
  apiV1.use('/media', mediaRouter);
  apiV1.use('/site-settings', siteSettingsRouter);

  app.use('/api/v1', apiV1);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
