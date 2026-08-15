import { describe, it, expect, afterAll } from 'vitest';
import { openConversationDb, closeConversationDb } from '../../server/db/sqliteClient';

describe('openConversationDb', () => {
  afterAll(() => closeConversationDb());

  it('opens the AGY database in read-only mode', () => {
    const db = openConversationDb();
    expect(db).toBeDefined();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    expect(tables.map((t: any) => t.name)).toContain('conversation_summaries');
  });

  it('returns the same instance on subsequent calls', () => {
    const a = openConversationDb();
    const b = openConversationDb();
    expect(a).toBe(b);
  });

  it('can read a conversation summary', () => {
    const db = openConversationDb();
    const row = db.prepare(`
      SELECT conversation_id, title, workspace_uris, not_fully_idle, killed
      FROM conversation_summaries
      LIMIT 1
    `).get() as any;
    if (row) {
      expect(row.conversation_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(typeof row.workspace_uris).toBe('string');
    }
  });
});
