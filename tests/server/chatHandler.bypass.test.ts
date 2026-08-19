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

  it('server rejects messages with dangerouslySkipPermissions at entry point', async () => {
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

    // Manually trigger the message handler with invalid payload
    messageHandler!(JSON.stringify({
      type: 'chat:send',
      conversationId: 'test-conv',
      payload: { message: 'hello', dangerouslySkipPermissions: true }
    }));

    // Server MUST reject messages with unknown fields at schema validation
    // The message is rejected before reaching TurnRunner
    const capturedOptions = (globalThis as any).__test_capturedOptions;
    expect(capturedOptions).toBeNull();

    // Verify that a chat:error was sent back to the client
    expect(fakeWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"chat:error"')
    );
  });
});
