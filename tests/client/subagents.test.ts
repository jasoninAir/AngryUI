import { describe, it, expect } from 'vitest';
import type { SubagentInfo, SubagentTranscriptStep } from '../../src/lib/api';

describe('Subagents API Types and Contracts', () => {
  it('formats SubagentInfo correctly', () => {
    const mockSub: SubagentInfo = {
      conversationId: 'sub-12345',
      typeName: 'research',
      role: 'Market Researcher',
      model: 'flash',
      prompt: 'Investigate price trends',
      state: 'running',
      stepCount: 3,
      createdAt: '2026-08-20T00:00:00Z',
      durationMs: 5000,
      transcriptUri: 'file:///tmp/logs.jsonl'
    };

    expect(mockSub.conversationId).toBe('sub-12345');
    expect(mockSub.state).toBe('running');
    expect(mockSub.durationMs).toBeGreaterThan(0);
  });

  it('validates SubagentTranscriptStep format', () => {
    const step: SubagentTranscriptStep = {
      stepIndex: 1,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      thinking: 'Analyzing task requirements...',
      content: 'Here is the analysis',
      toolCalls: [
        {
          name: 'grep_search',
          args: { Query: 'function', SearchPath: '/src' },
          toolAction: 'Searching code'
        }
      ]
    };

    expect(step.stepIndex).toBe(1);
    expect(step.toolCalls?.[0].name).toBe('grep_search');
  });
});
