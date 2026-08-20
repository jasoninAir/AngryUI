import type { IncomingMessage } from 'http';
import type { Request, Response, NextFunction } from 'express';

export function checkToken(req: IncomingMessage, expected: string | null): boolean {
  if (!expected) return true; // no token required
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth === `Bearer ${expected}`) return true;

  // Check Cookie header (essential for iOS PWA / WebViews)
  const cookieHeader = req.headers['cookie'];
  if (typeof cookieHeader === 'string') {
    const match = cookieHeader.match(/(?:^|;\s*)angryui_auth_token=([^;]*)/);
    if (match && decodeURIComponent(match[1]) === expected) return true;
  }

  // Check WebSocket Subprotocol header (Sec-WebSocket-Protocol: bearer, <token>)
  const secProto = req.headers['sec-websocket-protocol'];
  if (typeof secProto === 'string') {
    const parts = secProto.split(',').map((p) => p.trim());
    if (parts.length >= 2 && parts[0] === 'bearer' && parts[1] === expected) return true;
    if (parts.includes(expected)) return true;
  }

  // For WebSocket: also check URL token query (fallback)
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
