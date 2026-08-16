import { describe, it, expect } from 'vitest';
import { getConversationHistory } from '../../server/services/historyService';

describe('historyService', () => {
  it('returns empty result for non-existent conversation', () => {
    const res = getConversationHistory('non-existent-uuid', 5, 0);
    expect(res.messages).toEqual([]);
    expect(res.totalTurns).toBe(0);
    expect(res.hasMore).toBe(false);
  });

  it('can parse existing conversation transcript if available', () => {
    const res = getConversationHistory('001da18e-3f51-4371-8aab-b68ba6a8effc', 2, 0);
    if (res.totalTurns > 0) {
      expect(res.messages.length).toBeGreaterThan(0);
      expect(res.loadedTurns).toBe(2);
      expect(typeof res.hasMore).toBe('boolean');
    }
  });
});
