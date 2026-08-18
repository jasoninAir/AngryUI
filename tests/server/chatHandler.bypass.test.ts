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

  it('server must not pass dangerouslySkipPermissions from client payload to TurnRunner', async () => {
    const fakeWs = {
      send: vi.fn(),
      readyState: 1, // OPEN
      on: vi.fn((event: string, handler: any) => {
        if (event === 'message') {
          // Immediately trigger the handler with our test message
          handler(JSON.stringify({
            type: 'chat:send',
            conversationId: 'test-conv',
            payload: { message: 'hello', dangerouslySkipPermissions: true }
          }));
        }
      }),
      close: vi.fn(),
    } as any;
    const fakeIndex = { applyDelta: vi.fn() } as any;

    handleChatConnection(fakeWs, fakeIndex);

    // Server MUST NOT forward dangerouslySkipPermissions to TurnRunner
    const capturedOptions = (globalThis as any).__test_capturedOptions;
    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions.dangerouslySkipPermissions).toBeUndefined();
  });
});
