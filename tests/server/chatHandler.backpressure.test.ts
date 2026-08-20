import { describe, it, expect, vi } from 'vitest';
import { handleChatConnection } from '../../server/ws/handlers/chatHandler';
import { conversationHub } from '../../server/ws/conversationHub';
import { activeTurnManager } from '../../server/services/activeTurnManager';

describe('chatHandler Backpressure & Resubscription', () => {
  it('subscribes with lastSeq and replays incremental events', async () => {
    const convId = 'bp-conv-1';
    conversationHub.publish(convId, { type: 'step_update', step_index: 1, step_type: 'thought', state: 'RUNNING' });
    conversationHub.publish(convId, { type: 'step_update', step_index: 2, step_type: 'tool', state: 'RUNNING' });
    conversationHub.publish(convId, { type: 'step_update', step_index: 3, step_type: 'agent_response', state: 'RUNNING' });

    let messageHandler: ((data: Buffer) => void) | null = null;
    const sentMessages: string[] = [];
    const fakeWs = {
      send: vi.fn((str: string) => sentMessages.push(str)),
      readyState: 1, // OPEN
      OPEN: 1,
      bufferedAmount: 0,
      on: vi.fn((event: string, handler: any) => {
        if (event === 'message') messageHandler = handler;
      }),
      close: vi.fn(),
    } as any;

    const fakeIndex = { applyDelta: vi.fn() } as any;
    handleChatConnection(fakeWs, fakeIndex);

    // Client subscribes with lastSeq = 1 (requesting seq 2 and 3)
    messageHandler!(JSON.stringify({
      type: 'chat:subscribe',
      conversationId: convId,
      lastSeq: 1,
    }));

    await new Promise((r) => setTimeout(r, 20));

    const streamMsgs = sentMessages
      .map((s) => JSON.parse(s))
      .filter((m) => m.type === 'chat:stream' && m.conversationId === convId);

    expect(streamMsgs.map((m) => m.seq)).toEqual([2, 3]);
  });

  it('buffers outgoing messages when ws.bufferedAmount exceeds backpressure threshold and drains when low', async () => {
    const convId = 'bp-conv-drain';
    let messageHandler: ((data: Buffer) => void) | null = null;
    const sentMessages: string[] = [];

    const fakeWs = {
      send: vi.fn((str: string) => sentMessages.push(str)),
      readyState: 1, // OPEN
      OPEN: 1,
      bufferedAmount: 2 * 1024 * 1024, // 2MB (high buffered amount!)
      on: vi.fn((event: string, handler: any) => {
        if (event === 'message') messageHandler = handler;
      }),
      close: vi.fn(),
    } as any;

    const fakeIndex = { applyDelta: vi.fn() } as any;
    handleChatConnection(fakeWs, fakeIndex);

    // Subscribe
    messageHandler!(JSON.stringify({
      type: 'chat:subscribe',
      conversationId: convId,
    }));

    // Publish event while buffer is full
    conversationHub.publish(convId, { type: 'step_update', step_index: 10, step_type: 'thought', state: 'RUNNING' });

    // ws.send should not have sent the event immediately due to backpressure queueing
    const initialStreams = sentMessages.filter((s) => s.includes('"type":"chat:stream"'));
    expect(initialStreams.length).toBe(0);

    // Now buffer clears
    fakeWs.bufferedAmount = 0;
    await new Promise((r) => setTimeout(r, 100));

    // After draining, message should be flushed
    const flushedStreams = sentMessages.filter((s) => s.includes('"type":"chat:stream"'));
    expect(flushedStreams.length).toBe(1);
  });

  it('drops high-frequency text_delta when pauseWhenHidden is active and buffer is pressurized', async () => {
    const convId = 'bp-conv-hidden';
    let messageHandler: ((data: Buffer) => void) | null = null;
    const sentMessages: string[] = [];

    const fakeWs = {
      send: vi.fn((str: string) => sentMessages.push(str)),
      readyState: 1,
      OPEN: 1,
      bufferedAmount: 600 * 1024, // > 512KB
      on: vi.fn((event: string, handler: any) => {
        if (event === 'message') messageHandler = handler;
      }),
      close: vi.fn(),
    } as any;

    const fakeIndex = { applyDelta: vi.fn() } as any;
    handleChatConnection(fakeWs, fakeIndex);

    // Subscribe with pauseWhenHidden = true
    messageHandler!(JSON.stringify({
      type: 'chat:subscribe',
      conversationId: convId,
      pauseWhenHidden: true,
    }));

    // Publish an agent text_delta
    conversationHub.publish(convId, {
      type: 'step_update',
      step_index: 1,
      step_type: 'agent_response',
      state: 'RUNNING',
      text_delta: 'streaming text...'
    });

    await new Promise((r) => setTimeout(r, 20));

    // Agent text delta should be skipped under pressure
    const deltaStreams = sentMessages.filter((s) => s.includes('streaming text...'));
    expect(deltaStreams.length).toBe(0);
  });
});
