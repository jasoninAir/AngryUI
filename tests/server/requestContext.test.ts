import { describe, it, expect } from 'vitest';
import { runWithRequestContext, getRequestContext, generateRequestId } from '../../server/utils/requestContext';

describe('RequestContext with AsyncLocalStorage', () => {
  it('generates unique request IDs', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).toMatch(/^req_/);
    expect(id2).toMatch(/^req_/);
    expect(id1).not.toBe(id2);
  });

  it('maintains context across asynchronous execution', async () => {
    expect(getRequestContext()).toBeUndefined();

    const result = await runWithRequestContext(
      { requestId: 'test-req-123', conversationId: 'conv-abc' },
      async () => {
        const ctx1 = getRequestContext();
        expect(ctx1?.requestId).toBe('test-req-123');
        expect(ctx1?.conversationId).toBe('conv-abc');

        await new Promise((r) => setTimeout(r, 10));

        const ctx2 = getRequestContext();
        expect(ctx2?.requestId).toBe('test-req-123');
        return ctx2?.requestId;
      }
    );

    expect(result).toBe('test-req-123');
    expect(getRequestContext()).toBeUndefined();
  });
});
