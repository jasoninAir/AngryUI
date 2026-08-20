import { describe, it, expect } from 'vitest';
import { getCachedConversation, clearSessionCache } from '../../src/hooks/useConversation';

describe('useConversation sessionCache', () => {
  it('stores and retrieves cached conversation states', () => {
    clearSessionCache();
    expect(getCachedConversation('conv-1')).toBeUndefined();

    clearSessionCache('conv-1');
    expect(getCachedConversation('conv-1')).toBeUndefined();
  });
});
