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
  // Track last_modified_time per conversation so we can detect updates
  // (not just new IDs). This fixes the bug where existing conversations
  // with new turns were silently ignored.
  private lastSeenTimes = new Map<string, string>();

  constructor(index: ConversationIndex) {
    this.index = index;
  }

  start(onChange: (event: DiscoveryEvent) => void): void {
    const cfg = getConfig();
    this.index.load();
    this.lastSeenTimes.clear();
    for (const c of this.index.getAll()) {
      this.lastSeenTimes.set(c.conversation_id, c.last_modified_time);
    }

    const dbPath = path.join(cfg.agyHome, 'conversation_summaries.db');
    const historyPath = path.join(cfg.agyHome, 'history.jsonl');
    const brainPath = path.join(cfg.agyHome, 'brain');

    this.watcher = chokidar.watch([dbPath, historyPath, brainPath], {
      persistent: true,
      ignoreInitial: true,
      depth: 3,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 }
    });

    this.watcher.on('all', () => {
      this.refresh(onChange);
    });
  }

  stop(): void {
    this.watcher?.close();
  }

  private refresh(onChange: (event: DiscoveryEvent) => void): void {
    this.index.load();
    const db = openConversationDb();
    const rows = db.prepare(`
      SELECT conversation_id, title, preview, step_count, last_modified_time,
             workspace_uris, status, source, project_id, agent_name,
             parent_conversation_id, nesting_depth, not_fully_idle, killed,
             last_user_input_time
      FROM conversation_summaries
    `).all() as any[];

    const currentTimes = new Map<string, string>();
    const parsed: ConversationSummary[] = rows.map((row) => ({
      ...row,
      workspace_uris: parseWorkspaceUris(row.workspace_uris),
      not_fully_idle: Boolean(row.not_fully_idle),
      killed: Boolean(row.killed)
    }));

    for (const c of parsed) {
      currentTimes.set(c.conversation_id, c.last_modified_time);
      const prevTime = this.lastSeenTimes.get(c.conversation_id);

      // New conversation OR existing conversation whose last_modified_time changed.
      if (!prevTime || prevTime !== c.last_modified_time) {
        this.index.applyDelta([c]);
        onChange({ type: 'upsert', conversation_id: c.conversation_id, summary: c });
      }
    }

    for (const id of this.lastSeenTimes.keys()) {
      if (!currentTimes.has(id)) {
        onChange({ type: 'remove', conversation_id: id });
      }
    }

    this.lastSeenTimes = currentTimes;
  }
}

/**
 * Defensive parser for workspace_uris from SQLite.
 * Accepts either a JSON-encoded string or an already-parsed array.
 * Returns [] on malformed input.
 */
function parseWorkspaceUris(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
