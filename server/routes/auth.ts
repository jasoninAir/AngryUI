import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { checkToken } from '../utils/tokens';

export function createAuthRouter(expectedToken: string | null): Router {
  const router = Router();

  // Strict rate limit on login attempts: 10 per minute per IP to prevent brute-force attacks
  const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again later.', code: 'RATE_LIMITED' }
  });

  // GET /auth/status - Check authentication status
  router.get('/auth/status', (req, res) => {
    const isAuthenticated = checkToken(req, expectedToken);
    res.json({
      authenticated: isAuthenticated,
      tokenRequired: expectedToken !== null,
      authRequired: expectedToken !== null
    });
  });

  // POST /auth/login - Login endpoint (validates token)
  const handleLogin = (req: any, res: any) => {
    if (!expectedToken) {
      return res.json({ ok: true, authenticated: true, token: null });
    }

    const { token } = req.body ?? {};
    if (typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({
        error: 'Access token is required',
        code: 'TOKEN_REQUIRED',
        requestId: req.requestId
      });
    }

    if (token.trim() === expectedToken.trim()) {
      return res.json({ ok: true, authenticated: true, token: token.trim() });
    } else {
      return res.status(401).json({
        error: 'Invalid access token',
        code: 'INVALID_TOKEN',
        authenticated: false,
        requestId: req.requestId
      });
    }
  };

  router.post('/auth/login', loginLimiter, handleLogin);
  router.post('/login', loginLimiter, handleLogin);

  return router;
}
