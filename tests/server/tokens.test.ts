import { describe, it, expect } from 'vitest';
import { checkToken } from '../../server/utils/tokens';

describe('tokens utility & subprotocol authentication', () => {
  it('allows access when no token is required', () => {
    const req: any = { headers: {} };
    expect(checkToken(req, null)).toBe(true);
  });

  it('verifies Authorization Bearer header', () => {
    const req: any = {
      headers: { authorization: 'Bearer secret123' }
    };
    expect(checkToken(req, 'secret123')).toBe(true);
    expect(checkToken(req, 'wrong')).toBe(false);
  });

  it('verifies Cookie angryui_auth_token header', () => {
    const req: any = {
      headers: { cookie: 'other=1; angryui_auth_token=secret123; foo=bar' }
    };
    expect(checkToken(req, 'secret123')).toBe(true);
    expect(checkToken(req, 'wrong')).toBe(false);
  });

  it('verifies Sec-WebSocket-Protocol header with bearer subprotocol', () => {
    const req: any = {
      headers: { 'sec-websocket-protocol': 'bearer, secret123' }
    };
    expect(checkToken(req, 'secret123')).toBe(true);
    expect(checkToken(req, 'wrong')).toBe(false);
  });

  it('verifies URL query parameter fallback', () => {
    const req: any = {
      headers: {},
      url: '/ws?token=secret123'
    };
    expect(checkToken(req, 'secret123')).toBe(true);
    expect(checkToken(req, 'wrong')).toBe(false);
  });
});
