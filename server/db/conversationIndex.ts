import {
  openConversationDb,
  openConversationDbWrite,
  ConversationSummary
} from './sqliteClient';
import {
  readArchivedIds,
  setConversationArchived,
  deleteLocalSessionFiles,
  readCustomTitles,
  setCustomTitle
} from '../services/sessionMetaService';
import { syncUnindexedDiskSessions } from '../services/sessionSummaryService';

const SELECT_ALL = `
  SELECT
    conversation_id, title, preview, step_count, last_modified_time,
    workspace_uris, status, source, project_id, agent_name,
    parent_conversation_id, nesting_depth, not_fully_idle, killed,
    last_user_input_time
  FROM conversation_summaries
  ORDER BY last_modified_time DESC
`;

export interface GroupedProjectResponse {
  groups: Array<{ workspace: string; conversations: ConversationSummary[] }>;
  totalCount: number;
  archivedCount: number;
}

export class ConversationIndex {
  private byId = new Map<string, ConversationSummary>();

  load(): void {
    syncUnindexedDiskSessions();
    const db = openConversationDb();
    const rows = db.prepare(SELECT_ALL).all() as any[];
    this.byId.clear();
    const archivedIds = readArchivedIds();
    const customTitles = readCustomTitles();
    for (const row of rows) {
      const parsed = this.parseRow(row);
      parsed.is_archived = archivedIds.has(parsed.conversation_id);
      const ct = customTitles.get(parsed.conversation_id);
      if (ct) {
        parsed.title = ct;
      }
      this.byId.set(row.conversation_id, parsed);
    }
  }

  getAll(): ConversationSummary[] {
    const archivedIds = readArchivedIds();
    return Array.from(this.byId.values()).map((c) => ({
      ...c,
      is_archived: archivedIds.has(c.conversation_id)
    }));
  }

  getById(id: string): ConversationSummary | undefined {
    const item = this.byId.get(id);
    if (!item) return undefined;
    return {
      ...item,
      is_archived: readArchivedIds().has(id)
    };
  }

  applyDelta(rows: ConversationSummary[]): void {
    const archivedIds = readArchivedIds();
    for (const row of rows) {
      this.byId.set(row.conversation_id, {
        ...row,
        is_archived: archivedIds.has(row.conversation_id)
      });
    }
  }

  /**
   * Rename a conversation title in SQLite and update the in-memory cache.
   */
  rename(conversationId: string, newTitle: string): boolean {
    try {
      const trimmed = newTitle.trim();
      const db = openConversationDbWrite();
      const stmt = db.prepare(
        'UPDATE conversation_summaries SET title = ? WHERE conversation_id = ?'
      );
      const res = stmt.run(trimmed, conversationId);
      db.close();

      setCustomTitle(conversationId, trimmed);

      const existing = this.byId.get(conversationId);
      if (existing) {
        existing.title = trimmed;
        this.byId.set(conversationId, existing);
      }
      return true;
    } catch (e) {
      console.error(`Failed to rename conversation ${conversationId}:`, e);
      return false;
    }
  }

  /**
   * Archive / unarchive a conversation.
   */
  archive(conversationId: string, archived = true): boolean {
    const item = this.byId.get(conversationId);
    if (!item) return false;
    setConversationArchived(conversationId, archived);
    item.is_archived = archived;
    this.byId.set(conversationId, item);
    return true;
  }

  /**
   * Delete a conversation from SQLite database, local disk files (conversations/*.db, brain/*, history.jsonl),
   * and in-memory cache.
   */
  delete(conversationId: string): boolean {
    try {
      const db = openConversationDbWrite();
      const stmt = db.prepare('DELETE FROM conversation_summaries WHERE conversation_id = ?');
      const res = stmt.run(conversationId);
      db.close();

      // Permanently remove all local database, protobuf, brain folder, and history.jsonl entries
      deleteLocalSessionFiles(conversationId);

      this.byId.delete(conversationId);
      setConversationArchived(conversationId, false);
      return true;
    } catch (e) {
      console.error(`Failed to delete conversation ${conversationId}:`, e);
      return false;
    }
  }

  /**
   * Group conversations by their primary workspace root.
   * By default filters out archived conversations unless showArchived is true.
   */
  groupByWorkspace(showArchived = false): GroupedProjectResponse {
    const archivedIds = readArchivedIds();
    const groups = new Map<string, ConversationSummary[]>();
    let totalCount = 0;
    let archivedCount = 0;

    for (const c of this.byId.values()) {
      totalCount++;
      const isArchived = archivedIds.has(c.conversation_id);
      if (isArchived) {
        archivedCount++;
      }

      if (!showArchived && isArchived) {
        continue;
      }

      const key = c.workspace_uris[0] ?? 'unknown';
      const arr = groups.get(key) ?? [];
      arr.push({
        ...c,
        is_archived: isArchived
      });
      groups.set(key, arr);
    }

    const groupList = [...groups.entries()].map(([workspace, conversations]) => ({
      workspace,
      conversations
    }));

    return {
      groups: groupList,
      totalCount,
      archivedCount
    };
  }

  private parseRow(row: any): ConversationSummary {
    let uris: string[] = [];
    if (Array.isArray(row.workspace_uris)) {
      uris = row.workspace_uris;
    } else if (typeof row.workspace_uris === 'string') {
      try {
        uris = JSON.parse(row.workspace_uris);
      } catch {
        uris = [];
      }
    }

    return {
      ...row,
      workspace_uris: uris,
      not_fully_idle: Boolean(row.not_fully_idle),
      killed: Boolean(row.killed)
    };
  }
}
