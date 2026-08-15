import { openConversationDb, ConversationSummary } from './sqliteClient';

const SELECT_ALL = `
  SELECT
    conversation_id, title, preview, step_count, last_modified_time,
    workspace_uris, status, source, project_id, agent_name,
    parent_conversation_id, nesting_depth, not_fully_idle, killed,
    last_user_input_time
  FROM conversation_summaries
  ORDER BY last_modified_time DESC
`;

export class ConversationIndex {
  private byId = new Map<string, ConversationSummary>();

  load(): void {
    const db = openConversationDb();
    const rows = db.prepare(SELECT_ALL).all() as any[];
    this.byId.clear();
    for (const row of rows) {
      this.byId.set(row.conversation_id, this.parseRow(row));
    }
  }

  getAll(): ConversationSummary[] {
    return Array.from(this.byId.values());
  }

  getById(id: string): ConversationSummary | undefined {
    return this.byId.get(id);
  }

  applyDelta(rows: ConversationSummary[]): void {
    for (const row of rows) {
      this.byId.set(row.conversation_id, row);
    }
  }

  /**
   * Group conversations by their primary workspace root.
   * Falls back to "unknown" if no workspace_uris.
   */
  groupByWorkspace(): Map<string, ConversationSummary[]> {
    const groups = new Map<string, ConversationSummary[]>();
    for (const c of this.byId.values()) {
      const key = c.workspace_uris[0] ?? 'unknown';
      const arr = groups.get(key) ?? [];
      arr.push(c);
      groups.set(key, arr);
    }
    return groups;
  }

  private parseRow(row: any): ConversationSummary {
    return {
      ...row,
      workspace_uris: JSON.parse(row.workspace_uris || '[]'),
      not_fully_idle: Boolean(row.not_fully_idle),
      killed: Boolean(row.killed)
    };
  }
}
