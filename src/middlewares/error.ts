import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error.errors || [], false, err.stack);
  }

  const { statusCode, message, errors, stack } = error;

  logger.error(`[${req.method}] ${req.originalUrl} - Status: ${statusCode} - Message: ${message}`, {
    stack,
    errors,
  });

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(env.NODE_ENV === 'development' ? { stack } : {}),
  });
};
