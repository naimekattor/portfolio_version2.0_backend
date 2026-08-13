import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/portfolio_db?schema=public'),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().default('super-secret-access-token-key-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().default('super-secret-refresh-token-key-change-in-production'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  MAX_FILE_SIZE: z.string().default('5242880').transform((val) => parseInt(val, 10)), // 5MB
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  ADMIN_PASSWORD: z.string().default('Admin@123456'),

  // SMTP Email Configuration
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform((val) => parseInt(val, 10)),
  SMTP_SECURE: z.string().default('false').transform((val) => val === 'true'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default(''),
  CONTACT_RECEIVER_EMAIL: z.string().optional().default(''),

  // AI Configuration
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  EMBEDDING_PROVIDER: z.string().default('local'),
});

export const env = envSchema.parse(process.env);
