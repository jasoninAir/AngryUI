import { describe, it, expect } from 'vitest';
import { ConversationHub } from '../../server/ws/conversationHub';

describe('ConversationHub Session Statuses', () => {
  it('tracks session statuses and broadcasts changes', () => {
    const hub = new ConversationHub();
    expect(hub.getStatus('conv-1')).toBe('IDLE');

    const statusChanges: Array<{ convId: string; status: string }> = [];
    const unsub = hub.onGlobalStatusChange((convId, status) => {
      statusChanges.push({ convId, status });
    });

    hub.setStatus('conv-1', 'RUNNING');
    expect(hub.getStatus('conv-1')).toBe('RUNNING');
    expect(hub.getAllStatuses()).toEqual({ 'conv-1': 'RUNNING' });

    hub.setStatus('conv-1', 'WAITING_INPUT');
    expect(hub.getStatus('conv-1')).toBe('WAITING_INPUT');

    hub.setStatus('conv-1', 'IDLE');
    expect(hub.getStatus('conv-1')).toBe('IDLE');
    expect(hub.getAllStatuses()).toEqual({});

    unsub();
    expect(statusChanges).toEqual([
      { convId: 'conv-1', status: 'RUNNING' },
      { convId: 'conv-1', status: 'WAITING_INPUT' },
      { convId: 'conv-1', status: 'IDLE' }
    ]);
  });
});
