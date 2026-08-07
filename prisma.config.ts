import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { defineConfig } from '@prisma/config';

export default defineConfig({
  engine: 'classic',
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
});
