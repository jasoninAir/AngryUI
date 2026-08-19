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

  it('groupByWorkspace returns structured response with groups array', () => {
    const res = idx.groupByWorkspace();
    expect(Array.isArray(res.groups)).toBe(true);
    expect(res.groups.length).toBeGreaterThan(0);
    expect(typeof res.totalCount).toBe('number');
    expect(typeof res.archivedCount).toBe('number');
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

  it('archive and unarchive toggle session archive status', () => {
    const testId = 'test-uuid-1';
    expect(idx.archive(testId, true)).toBe(true);
    expect(idx.getById(testId)?.is_archived).toBe(true);

    const filtered = idx.groupByWorkspace(false);
    const foundInActive = filtered.groups.some((g) =>
      g.conversations.some((c) => c.conversation_id === testId)
    );
    expect(foundInActive).toBe(false);

    const withArchived = idx.groupByWorkspace(true);
    const foundInAll = withArchived.groups.some((g) =>
      g.conversations.some((c) => c.conversation_id === testId)
    );
    expect(foundInAll).toBe(true);

    // Unarchive
    expect(idx.archive(testId, false)).toBe(true);
    expect(idx.getById(testId)?.is_archived).toBe(false);
  });

  it('rename persists title across index.load() reloads', () => {
    const sample = idx.getAll()[0];
    if (sample) {
      const originalTitle = sample.title;
      const renamedTitle = `Renamed-Title-${Date.now()}`;
      expect(idx.rename(sample.conversation_id, renamedTitle)).toBe(true);
      expect(idx.getById(sample.conversation_id)?.title).toBe(renamedTitle);

      // Reload index
      const newIdx = new ConversationIndex();
      newIdx.load();
      expect(newIdx.getById(sample.conversation_id)?.title).toBe(renamedTitle);

      // Restore original
      idx.rename(sample.conversation_id, originalTitle);
    }
  });

  it('filters out subagents by default in groupByWorkspace and retrieves them via getSubagents', () => {
    const parentId = 'parent-session-1';
    const subId = 'child-subagent-1';
    idx.applyDelta([
      {
        conversation_id: parentId,
        title: 'Parent Session',
        preview: 'Parent preview',
        step_count: 5,
        last_modified_time: '2026-08-16T00:00:00Z',
        workspace_uris: ['file:///tmp/workspace'],
        status: 'COMPLETED',
        source: 'CLI',
        project_id: '',
        agent_name: '',
        parent_conversation_id: '',
        nesting_depth: 0,
        not_fully_idle: false,
        killed: false,
        last_user_input_time: '2026-08-16T00:00:00Z'
      },
      {
        conversation_id: subId,
        title: 'Child Subagent',
        preview: 'Subagent preview',
        step_count: 2,
        last_modified_time: '2026-08-16T00:00:01Z',
        workspace_uris: ['file:///tmp/workspace'],
        status: 'COMPLETED',
        source: 'SUBAGENT',
        project_id: '',
        agent_name: '',
        parent_conversation_id: parentId,
        nesting_depth: 1,
        not_fully_idle: false,
        killed: false,
        last_user_input_time: '2026-08-16T00:00:01Z'
      }
    ]);

    const normal = idx.groupByWorkspace(false, false);
    const hasSubInNormal = normal.groups.some((g) => g.conversations.some((c) => c.conversation_id === subId));
    expect(hasSubInNormal).toBe(false);

    const withSubs = idx.groupByWorkspace(false, true);
    const hasSubInWithSubs = withSubs.groups.some((g) => g.conversations.some((c) => c.conversation_id === subId));
    expect(hasSubInWithSubs).toBe(true);

    const subagents = idx.getSubagents(parentId);
    expect(subagents.length).toBe(1);
    expect(subagents[0].conversation_id).toBe(subId);
  });
});
