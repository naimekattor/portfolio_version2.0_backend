import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level}]: ${stack || message}`;
      })
    ),
  }),
];

if (!isServerless && process.env.NODE_ENV !== 'test') {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: path.join(logDir, '%DATE%-combined.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
      }),
      new winston.transports.DailyRotateFile({
        level: 'error',
        filename: path.join(logDir, '%DATE%-error.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
      })
    );
  } catch (err) {
    // Ignore logging directory creation failure in restricted environments
  }
}

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports,
});
