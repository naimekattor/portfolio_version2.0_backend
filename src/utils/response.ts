import { Response } from 'express';

export interface ApiResponseOptions<T> {
  res: Response;
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: any;
}

export function sendSuccess<T>({
  res,
  statusCode = 200,
  message = 'Success',
  data = {} as T,
  meta,
}: ApiResponseOptions<T>) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function sendError({
  res,
  statusCode = 500,
  message = 'Internal Server Error',
  errors = [],
}: {
  res: Response;
  statusCode?: number;
  message?: string;
  errors?: any[];
}) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}
