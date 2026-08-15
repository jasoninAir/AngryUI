import type { IncomingMessage } from 'http';

export function checkToken(req: IncomingMessage, expected: string | null): boolean {
  if (!expected) return true; // no token required
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth === `Bearer ${expected}`) return true;
  // For WebSocket: also check URL token query
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.searchParams.get('token') === expected) return true;
  return false;
}
