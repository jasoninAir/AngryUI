import { describe, it, expect, beforeEach } from 'vitest';
import { getDraft, setDraft, clearDraft, getDraftKey } from '../../src/lib/draftStorage';

describe('ChatInput draft persistence (draftStorage)', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    };
  });

  it('generates proper draft storage key and persists text via draftStorage', () => {
    const convId = 'test-conv-123';
    expect(getDraftKey(convId)).toBe('angryui_draft_test-conv-123');

    expect(getDraft(convId)).toBe('');

    setDraft(convId, 'Draft prompt content...');
    expect(getDraft(convId)).toBe('Draft prompt content...');

    clearDraft(convId);
    expect(getDraft(convId)).toBe('');
  });

  it('removes draft when setDraft is called with empty text', () => {
    const convId = 'test-conv-empty';
    setDraft(convId, 'Some text');
    expect(getDraft(convId)).toBe('Some text');

    setDraft(convId, '   ');
    expect(getDraft(convId)).toBe('');
  });
});
