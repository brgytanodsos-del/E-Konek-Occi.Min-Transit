import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Attempt to get role from custom claims in the ID token
    const role = req.user?.role; 

    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}
