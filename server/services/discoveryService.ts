import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import { getConfig } from '../config';
import { ConversationIndex } from '../db/conversationIndex';
import { ConversationSummary, openConversationDb } from '../db/sqliteClient';

export type DiscoveryEvent =
  | { type: 'upsert'; conversation_id: string; summary: ConversationSummary }
  | { type: 'remove'; conversation_id: string };

export class DiscoveryService {
  private index: ConversationIndex;
  private watcher: FSWatcher | null = null;
  private lastSeenIds = new Set<string>();

  constructor(index: ConversationIndex) {
    this.index = index;
  }

  start(onChange: (event: DiscoveryEvent) => void): void {
    const cfg = getConfig();
    this.index.load();
    for (const c of this.index.getAll()) {
      this.lastSeenIds.add(c.conversation_id);
    }

    const dbPath = path.join(cfg.agyHome, 'conversation_summaries.db');
    const historyPath = path.join(cfg.agyHome, 'history.jsonl');

    this.watcher = chokidar.watch([dbPath, historyPath], {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 }
    });

    this.watcher.on('change', () => {
      this.refresh(onChange);
    });
  }

  stop(): void {
    this.watcher?.close();
  }

  private refresh(onChange: (event: DiscoveryEvent) => void): void {
    const db = openConversationDb();
    const rows = db.prepare(`
      SELECT conversation_id, title, preview, step_count, last_modified_time,
             workspace_uris, status, source, project_id, agent_name,
             parent_conversation_id, nesting_depth, not_fully_idle, killed,
             last_user_input_time
      FROM conversation_summaries
    `).all() as any[];

    const currentIds = new Set<string>();
    const parsed: ConversationSummary[] = rows.map((row) => ({
      ...row,
      workspace_uris: JSON.parse(row.workspace_uris || '[]'),
      not_fully_idle: Boolean(row.not_fully_idle),
      killed: Boolean(row.killed)
    }));

    for (const c of parsed) {
      currentIds.add(c.conversation_id);
      if (!this.lastSeenIds.has(c.conversation_id)) {
        this.index.applyDelta([c]);
        onChange({ type: 'upsert', conversation_id: c.conversation_id, summary: c });
      }
    }

    for (const id of this.lastSeenIds) {
      if (!currentIds.has(id)) {
        onChange({ type: 'remove', conversation_id: id });
      }
    }

    this.lastSeenIds = currentIds;
  }
}
