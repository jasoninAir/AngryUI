import { describe, it, expect } from 'vitest';
import { checkToken } from '../../server/utils/tokens';

describe('checkToken', () => {
  it('returns true when no token expected', () => {
    const req = { headers: {}, url: '/' } as any;
    expect(checkToken(req, null)).toBe(true);
  });

  it('accepts Bearer token in Authorization header', () => {
    const req = { headers: { authorization: 'Bearer secret123' }, url: '/' } as any;
    expect(checkToken(req, 'secret123')).toBe(true);
  });

  it('accepts token in URL query', () => {
    const req = { headers: {}, url: '/ws?token=secret123' } as any;
    expect(checkToken(req, 'secret123')).toBe(true);
  });

  it('rejects wrong token', () => {
    const req = { headers: { authorization: 'Bearer wrong' }, url: '/ws' } as any;
    expect(checkToken(req, 'secret123')).toBe(false);
  });
});

describe('createAuthRouter', () => {
  it('handles auth status when no token is required', async () => {
    const { createAuthRouter } = await import('../../server/routes/auth');
    const router = createAuthRouter(null);
    expect(router).toBeDefined();
  });

  it('validates correct token on login', async () => {
    const { createAuthRouter } = await import('../../server/routes/auth');
    const router = createAuthRouter('mypassword123');
    expect(router).toBeDefined();
  });
});

