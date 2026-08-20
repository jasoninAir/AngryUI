import { describe, it, expect, vi } from 'vitest';
import { ActiveTurnManager } from '../../server/services/activeTurnManager';

describe('ActiveTurnManager', () => {
  it('registers and tracks active turns', () => {
    const manager = new ActiveTurnManager();
    const abortFn = vi.fn();
    const fakeTurn = {
      conversationId: 'conv-123',
      handle: { pid: 9999, events: [] as any, abort: abortFn },
      abort: abortFn,
      startedAt: Date.now(),
      lastActivityAt: Date.now()
    };

    manager.register('conv-123', fakeTurn);
    expect(manager.has('conv-123')).toBe(true);
    expect(manager.count()).toBe(1);
    expect(manager.get('conv-123')?.handle.pid).toBe(9999);

    manager.updateActivity('conv-123');
    expect(manager.get('conv-123')?.lastActivityAt).toBeGreaterThanOrEqual(fakeTurn.startedAt);

    manager.abort('conv-123');
    expect(abortFn).toHaveBeenCalledTimes(1);
    expect(manager.has('conv-123')).toBe(false);
    expect(manager.count()).toBe(0);
  });

  it('aborts existing turn if same conversationId registers again', () => {
    const manager = new ActiveTurnManager();
    const abort1 = vi.fn();
    const abort2 = vi.fn();

    manager.register('conv-dup', {
      conversationId: 'conv-dup',
      handle: { pid: 101, events: [] as any, abort: abort1 },
      abort: abort1,
      startedAt: Date.now(),
      lastActivityAt: Date.now()
    });

    manager.register('conv-dup', {
      conversationId: 'conv-dup',
      handle: { pid: 102, events: [] as any, abort: abort2 },
      abort: abort2,
      startedAt: Date.now(),
      lastActivityAt: Date.now()
    });

    expect(abort1).toHaveBeenCalledTimes(1);
    expect(abort2).not.toHaveBeenCalled();
    expect(manager.get('conv-dup')?.handle.pid).toBe(102);
  });
});
