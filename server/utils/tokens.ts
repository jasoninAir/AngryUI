import type { IncomingMessage } from 'http';
import type { Request, Response, NextFunction } from 'express';

export function checkToken(req: IncomingMessage, expected: string | null): boolean {
  if (!expected) return true; // no token required
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth === `Bearer ${expected}`) return true;
  // For WebSocket: also check URL token query
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.searchParams.get('token') === expected) return true;
  return false;
}

/**
 * Express middleware that enforces token auth on protected routes.
 * Pass the expected token from config; pass null to disable auth.
 *
 * Public routes (e.g. /api/health) should NOT mount this middleware.
 */
export function requireAuth(expected: string | null) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!checkToken(req, expected)) {
      res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED', requestId: (req as any).requestId });
      return;
    }
    next();
  };
}
