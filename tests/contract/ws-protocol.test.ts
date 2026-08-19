import { describe, it, expect } from 'vitest';
import { ClientMsgSchema, ServerMsgSchema } from '../../server/ws/protocol';

describe('ClientMsgSchema round-trip', () => {
  it('chat:subscribe serializes and parses', () => {
    const msg = { type: 'chat:subscribe', conversationId: 'test' };
    const parsed = ClientMsgSchema.parse(msg);
    expect(parsed).toEqual(msg);
  });
  it('chat:send with minimal payload', () => {
    const msg = { type: 'chat:send', conversationId: 'test', payload: { message: 'hello' } };
    expect(() => ClientMsgSchema.parse(msg)).not.toThrow();
  });
  it('rejects chat:send with dangerouslySkipPermissions', () => {
    const msg = { type: 'chat:send', conversationId: 'test', payload: { message: 'hi', dangerouslySkipPermissions: true } };
    expect(() => ClientMsgSchema.parse(msg)).toThrow();
  });
});
