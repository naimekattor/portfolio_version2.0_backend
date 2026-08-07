import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { ApiError } from '../utils/api-error.js';

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'User not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Permission denied: Insufficient role permissions'));
    }

    next();
  };
};
