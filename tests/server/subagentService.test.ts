import { describe, it, expect } from 'vitest';
import { getConversationSubagents, getSubagentTranscript } from '../../server/services/subagentService';

describe('subagentService', () => {
  it('returns empty list gracefully for non-existent conversation', () => {
    const result = getConversationSubagents('00000000-0000-0000-0000-000000000000');
    expect(result).toBeDefined();
    expect(result.parentId).toBe('00000000-0000-0000-0000-000000000000');
    expect(Array.isArray(result.subagents)).toBe(true);
  });

  it('returns empty array for non-existent subagent transcript', () => {
    const steps = getSubagentTranscript('00000000-0000-0000-0000-000000000000');
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBe(0);
  });
});
