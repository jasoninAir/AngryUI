import { describe, it, expect } from 'vitest';
import { ClientMsgSchema, ServerMsgSchema } from '../../server/ws/protocol';

describe('ClientMsgSchema round-trip', () => {
  it('chat:subscribe serializes and parses', () => {
    const msg = { type: 'chat:subscribe', conversationId: 'test' };
    const parsed = ClientMsgSchema.parse(msg);
    expect(parsed.type).toBe('chat:subscribe');
  });
  it('chat:send with minimal payload', () => {
    const msg = { type: 'chat:send', conversationId: 'test', payload: { message: 'hello' } };
    expect(() => ClientMsgSchema.parse(msg)).not.toThrow();
  });
  it('parses dangerouslySkipPermissions in chat:send payload for Auto-Approve mode', () => {
    const msg = { type: 'chat:send', conversationId: 'test', payload: { message: 'hi', dangerouslySkipPermissions: true } };
    const parsed = ClientMsgSchema.parse(msg);
    expect((parsed as any).payload.dangerouslySkipPermissions).toBe(true);
    expect((parsed as any).payload.message).toBe('hi');
  });
  it('tolerates extra timestamp field on envelope', () => {
    const msg = { type: 'chat:subscribe', conversationId: 'test', payload: {}, timestamp: Date.now() };
    expect(() => ClientMsgSchema.parse(msg)).not.toThrow();
  });
});
