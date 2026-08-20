import { describe, it, expect } from 'vitest';
import { ClientMsgSchema, ServerMsgSchema } from '../../server/ws/protocol';

describe('ClientMsgSchema round-trip', () => {
  it('chat:subscribe serializes and parses', () => {
    const msg = { type: 'chat:subscribe', conversationId: 'test' };
    const parsed = ClientMsgSchema.parse(msg);
    expect(parsed.type).toBe('chat:subscribe');
  });
  it('chat:subscribe with lastSeq and pauseWhenHidden', () => {
    const msg = { type: 'chat:subscribe', conversationId: 'test', lastSeq: 42, pauseWhenHidden: true };
    const parsed = ClientMsgSchema.parse(msg);
    expect(parsed.type).toBe('chat:subscribe');
    expect((parsed as any).lastSeq).toBe(42);
    expect((parsed as any).pauseWhenHidden).toBe(true);
  });
  it('chat:reconnect_resume with lastSeq', () => {
    const msg = { type: 'chat:reconnect_resume', conversationId: 'test', lastSeq: 100 };
    const parsed = ClientMsgSchema.parse(msg);
    expect(parsed.type).toBe('chat:reconnect_resume');
    expect((parsed as any).lastSeq).toBe(100);
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

describe('ServerMsgSchema round-trip', () => {
  it('parses chat:stream with seq', () => {
    const msg = {
      type: 'chat:stream',
      conversationId: 'test',
      payload: { type: 'step_update', step_index: 1 },
      seq: 15,
      timestamp: Date.now()
    };
    const parsed = ServerMsgSchema.parse(msg);
    expect(parsed.type).toBe('chat:stream');
    expect((parsed as any).seq).toBe(15);
  });

  it('parses chat:buffer_truncated', () => {
    const msg = {
      type: 'chat:buffer_truncated',
      conversationId: 'test',
      payload: { droppedSeq: 51, lastSeq: 10 },
      timestamp: Date.now()
    };
    const parsed = ServerMsgSchema.parse(msg);
    expect(parsed.type).toBe('chat:buffer_truncated');
    expect((parsed as any).payload.droppedSeq).toBe(51);
  });
});
