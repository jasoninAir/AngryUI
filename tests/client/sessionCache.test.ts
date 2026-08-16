import { describe, it, expect, beforeEach } from 'vitest';
import { getCachedConversation, clearSessionCache } from '../../src/hooks/useConversation';

describe('useConversation sessionCache', () => {
  beforeEach(() => {
    clearSessionCache();
  });

  it('initially has no cached state', () => {
    expect(getCachedConversation('test-id')).toBeUndefined();
  });

  it('can clear cache per id or all', () => {
    clearSessionCache('test-id');
    expect(getCachedConversation('test-id')).toBeUndefined();
  });
});
