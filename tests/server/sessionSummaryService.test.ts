import { describe, it, expect } from 'vitest';
import {
  cleanUserPrompt,
  extractSessionSummary,
  syncUnindexedDiskSessions
} from '../../server/services/sessionSummaryService';
import { ConversationIndex } from '../../server/db/conversationIndex';

describe('sessionSummaryService', () => {
  it('cleanUserPrompt cleans XML tags and prompt metadata', () => {
    const raw = '<USER_REQUEST>\n这是一个技能页面，请你看一下GPSR相关的两个技能\n</USER_REQUEST>\n<ADDITIONAL_METADATA>\ntime\n</ADDITIONAL_METADATA>';
    const cleaned = cleanUserPrompt(raw);
    expect(cleaned).toBe('这是一个技能页面，请你看一下GPSR相关的两个技能');
  });

  it('syncUnindexedDiskSessions populates index with existing brain sessions', () => {
    syncUnindexedDiskSessions();
    const idx = new ConversationIndex();
    idx.load();
    const all = idx.getAll();
    expect(all.length).toBeGreaterThan(0);
  });
});
