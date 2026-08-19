import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleChatConnection } from '../../server/ws/handlers/chatHandler';

// We need to mock the TurnRunner module since it's imported at module level
vi.mock('../../server/services/turnRunner', () => ({
  TurnRunner: class {
    spawn(opts: any) {
      // Store the options globally for test inspection
      (globalThis as any).__test_capturedOptions = opts;
      return {
        abort: vi.fn(), pid: 1,
        events: { [Symbol.asyncIterator]: () => ({ next: () => Promise.resolve({ done: true }) }) }
      };
    }
    quota() { return Promise.resolve(''); }
  },
}));

describe('dangerouslySkipPermissions bypass prevention', () => {
  beforeEach(() => {
    (globalThis as any).__test_capturedOptions = null;
  });

  it('server strips dangerouslySkipPermissions before reaching TurnRunner', async () => {
    let messageHandler: ((data: Buffer) => void) | null = null;
    const fakeWs = {
      send: vi.fn(),
      readyState: 1, // OPEN
      OPEN: 1, // WebSocket.OPEN constant
      on: vi.fn((event: string, handler: any) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      }),
      close: vi.fn(),
    } as any;
    const fakeIndex = { applyDelta: vi.fn() } as any;

    handleChatConnection(fakeWs, fakeIndex);

    // Send a message with dangerouslySkipPermissions in the payload
    messageHandler!(JSON.stringify({
      type: 'chat:send',
      conversationId: 'test-conv',
      payload: { message: 'hello', dangerouslySkipPermissions: true }
    }));

    // Wait for async event processing
    await new Promise((r) => setTimeout(r, 50));

    // The message SHOULD be accepted (not rejected), but the dangerous
    // field must be stripped by Zod .strip() before reaching TurnRunner
    const capturedOptions = (globalThis as any).__test_capturedOptions;
    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions.message).toBe('hello');
    // The key assertion: dangerouslySkipPermissions never reaches the runner
    expect(capturedOptions).not.toHaveProperty('dangerouslySkipPermissions');

    // No chat:error should have been sent — the message was valid
    const errorCalls = fakeWs.send.mock.calls.filter((c: any) =>
      c[0].includes('"type":"chat:error"')
    );
    expect(errorCalls.length).toBe(0);
  });
});
