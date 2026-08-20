import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleChatConnection } from '../../server/ws/handlers/chatHandler';
import { conversationHub } from '../../server/ws/conversationHub';
import { activeTurnManager } from '../../server/services/activeTurnManager';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../../config';

describe('chatHandler WS protocol & resilience', () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  it('subscribes with lastSeq and receives incremental stream replay', async () => {
    const convId = 'test-sub-seq';
    // Pre-populate some events in conversationHub
    conversationHub.publish(convId, { type: 'step_update', step_index: 1, step_type: 'thought', state: 'RUNNING' });
    conversationHub.publish(convId, { type: 'step_update', step_index: 2, step_type: 'tool', state: 'RUNNING' });

    let messageHandler: ((data: Buffer) => void) | null = null;
    const fakeWs = {
      send: vi.fn(),
      readyState: 1,
      bufferedAmount: 0,
      OPEN: 1,
      on: vi.fn((event: string, handler: any) => {
        if (event === 'message') messageHandler = handler;
      }),
      close: vi.fn(),
    } as any;

    handleChatConnection(fakeWs, { applyDelta: vi.fn() } as any);

    // Subscribe asking only for events after lastSeq = 1
    messageHandler!(JSON.stringify({
      type: 'chat:subscribe',
      conversationId: convId,
      lastSeq: 1,
    }));

    await new Promise((r) => setTimeout(r, 20));

    // Should have received session:status and stream event seq 2
    const streamCalls = fakeWs.send.mock.calls
      .map((call: any) => JSON.parse(call[0]))
      .filter((msg: any) => msg.type === 'chat:stream');

    expect(streamCalls.length).toBe(1);
    expect(streamCalls[0].seq).toBe(2);
  });

  it('supports chat:reconnect_resume', async () => {
    const convId = 'test-resume';
    conversationHub.publish(convId, { type: 'step_update', step_index: 1, step_type: 'thought', state: 'RUNNING' });

    let messageHandler: ((data: Buffer) => void) | null = null;
    const fakeWs = {
      send: vi.fn(),
      readyState: 1,
      bufferedAmount: 0,
      OPEN: 1,
      on: vi.fn((event: string, handler: any) => {
        if (event === 'message') messageHandler = handler;
      }),
      close: vi.fn(),
    } as any;

    handleChatConnection(fakeWs, { applyDelta: vi.fn() } as any);

    messageHandler!(JSON.stringify({
      type: 'chat:reconnect_resume',
      conversationId: convId,
      lastSeq: 0,
    }));

    await new Promise((r) => setTimeout(r, 20));

    const statusMsg = fakeWs.send.mock.calls
      .map((call: any) => JSON.parse(call[0]))
      .find((msg: any) => msg.type === 'session:status');

    expect(statusMsg).toBeDefined();
  });

  it('responds to chat:ping with chat:pong and echoes clientTs', async () => {
    let messageHandler: ((data: Buffer) => void) | null = null;
    const sentMsgs: string[] = [];
    const fakeWs = {
      send: vi.fn((s) => sentMsgs.push(s)),
      readyState: 1,
      bufferedAmount: 0,
      OPEN: 1,
      on: vi.fn((event: string, handler: any) => {
        if (event === 'message') messageHandler = handler;
      }),
      close: vi.fn(),
    } as any;

    handleChatConnection(fakeWs, { applyDelta: vi.fn() } as any);

    const clientTs = Date.now() - 50;
    messageHandler!(JSON.stringify({
      type: 'chat:ping',
      timestamp: clientTs,
    }));

    await new Promise((r) => setTimeout(r, 20));

    const pongMsg = sentMsgs
      .map((s) => JSON.parse(s))
      .find((m) => m.type === 'chat:pong');

    expect(pongMsg).toBeDefined();
    expect(pongMsg.payload.clientTs).toBe(clientTs);
  });

  it('rejects chat:send with missing or non-existent workspace path', async () => {
    const convId = 'test-invalid-ws';
    let messageHandler: ((data: Buffer) => void) | null = null;
    const sentMsgs: string[] = [];
    const fakeWs = {
      send: vi.fn((s) => sentMsgs.push(s)),
      readyState: 1,
      bufferedAmount: 0,
      OPEN: 1,
      on: vi.fn((event: string, handler: any) => {
        if (event === 'message') messageHandler = handler;
      }),
      close: vi.fn(),
    } as any;

    handleChatConnection(fakeWs, { applyDelta: vi.fn(), get: vi.fn() } as any);

    messageHandler!(JSON.stringify({
      type: 'chat:send',
      conversationId: convId,
      payload: {
        message: 'hello',
        workspace: '/totally/invalid/path/that/does/not/exist/98765'
      }
    }));

    await new Promise((r) => setTimeout(r, 20));

    const errorMsg = sentMsgs
      .map((s) => JSON.parse(s))
      .find((m) => m.type === 'chat:error' && m.payload?.code === 'INVALID_WORKSPACE');

    expect(errorMsg).toBeDefined();
    expect(errorMsg.payload.message).toContain('Workspace does not exist');
  });

  it('rejects chat:send if a turn is already running for the conversation', async () => {
    const convId = 'test-concurrent-turn';
    const abortMock = vi.fn();
    activeTurnManager.register(convId, {
      conversationId: convId,
      handle: { pid: 1234, events: {} as any, abort: abortMock },
      abort: abortMock,
      startedAt: Date.now(),
      lastActivityAt: Date.now()
    });

    let messageHandler: ((data: Buffer) => void) | null = null;
    const sentMsgs: string[] = [];
    const fakeWs = {
      send: vi.fn((s) => sentMsgs.push(s)),
      readyState: 1,
      bufferedAmount: 0,
      OPEN: 1,
      on: vi.fn((event: string, handler: any) => {
        if (event === 'message') messageHandler = handler;
      }),
      close: vi.fn(),
    } as any;

    handleChatConnection(fakeWs, { applyDelta: vi.fn(), get: vi.fn() } as any);

    messageHandler!(JSON.stringify({
      type: 'chat:send',
      conversationId: convId,
      payload: {
        message: 'second prompt while first is running',
        workspace: process.cwd()
      }
    }));

    await new Promise((r) => setTimeout(r, 20));

    const errorMsg = sentMsgs
      .map((s) => JSON.parse(s))
      .find((m) => m.type === 'chat:error' && m.payload?.code === 'TURN_ALREADY_RUNNING');

    expect(errorMsg).toBeDefined();
    activeTurnManager.remove(convId);
  });

  it('handles chat:cancel by aborting active turn in activeTurnManager', async () => {
    const convId = 'test-cancel-conv';
    const abortMock = vi.fn();

    activeTurnManager.register(convId, {
      conversationId: convId,
      handle: { pid: 999, events: {} as any, abort: abortMock },
      abort: abortMock,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
    });
    conversationHub.setStatus(convId, 'RUNNING');

    let messageHandler: ((data: Buffer) => void) | null = null;
    const fakeWs = {
      send: vi.fn(),
      readyState: 1,
      bufferedAmount: 0,
      OPEN: 1,
      on: vi.fn((event: string, handler: any) => {
        if (event === 'message') messageHandler = handler;
      }),
      close: vi.fn(),
    } as any;

    handleChatConnection(fakeWs, { applyDelta: vi.fn() } as any);

    messageHandler!(JSON.stringify({
      type: 'chat:cancel',
      conversationId: convId,
    }));

    expect(abortMock).toHaveBeenCalled();
    expect(conversationHub.getStatus(convId)).toBe('IDLE');
    expect(activeTurnManager.has(convId)).toBe(false);
  });

  it('queues messages when ws.bufferedAmount exceeds backpressure threshold', async () => {
    const convId = 'test-backpressure';
    let messageHandler: ((data: Buffer) => void) | null = null;
    const fakeWs = {
      send: vi.fn(),
      readyState: 1,
      bufferedAmount: 2 * 1024 * 1024, // 2MB (> 1MB threshold)
      OPEN: 1,
      on: vi.fn((event: string, handler: any) => {
        if (event === 'message') messageHandler = handler;
      }),
      close: vi.fn(),
    } as any;

    handleChatConnection(fakeWs, { applyDelta: vi.fn() } as any);

    // Initial send was queued because bufferedAmount > threshold
    expect(fakeWs.send).toHaveBeenCalledTimes(0);

    // Buffer clears
    fakeWs.bufferedAmount = 0;
    // Wait for flush timer
    await new Promise((r) => setTimeout(r, 80));

    expect(fakeWs.send.mock.calls.length).toBeGreaterThan(0);
  });
});
