import { describe, it, expect, beforeAll } from 'vitest';
import { ConversationIndex } from '../../server/db/conversationIndex';

describe('ConversationIndex', () => {
  let idx: ConversationIndex;

  beforeAll(() => {
    idx = new ConversationIndex();
    idx.load();
  });

  it('loads conversations from the database', () => {
    const all = idx.getAll();
    expect(all.length).toBeGreaterThan(0);
  });

  it('returns conversations parsed with workspace_uris as array', () => {
    const all = idx.getAll();
    const sample = all[0];
    expect(Array.isArray(sample.workspace_uris)).toBe(true);
  });

  it('groupByWorkspace returns non-empty groups', () => {
    const groups = idx.groupByWorkspace();
    expect(groups.size).toBeGreaterThan(0);
  });

  it('applyDelta inserts new conversation', () => {
    const newRow = {
      conversation_id: 'test-uuid-1',
      title: 'Test',
      preview: '',
      step_count: 0,
      last_modified_time: '2026-08-15T00:00:00Z',
      workspace_uris: ['file:///tmp/test'],
      status: '',
      source: '',
      project_id: '',
      agent_name: '',
      parent_conversation_id: '',
      nesting_depth: 0,
      not_fully_idle: false,
      killed: false,
      last_user_input_time: '2026-08-15T00:00:00Z'
    };
    const before = idx.getAll().length;
    idx.applyDelta([newRow]);
    const after = idx.getAll().length;
    expect(after).toBe(before + 1);
    expect(idx.getById('test-uuid-1')?.title).toBe('Test');
  });
});
