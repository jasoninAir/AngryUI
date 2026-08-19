import Database from 'better-sqlite3';
import path from 'path';
import { getConfig } from '../config';

export interface ConversationSummary {
  conversation_id: string;
  title: string;
  preview: string;
  step_count: number;
  last_modified_time: string;
  workspace_uris: string[];
  status: string;
  source: string;
  project_id: string;
  agent_name: string;
  parent_conversation_id: string;
  nesting_depth: number;
  not_fully_idle: boolean;
  killed: boolean;
  last_user_input_time: string;
  is_archived?: boolean;
}

let cached: Database.Database | null = null;

export function openConversationDb(): Database.Database {
  if (cached && cached.open) return cached;
  const dbPath = path.join(getConfig().agyHome, 'conversation_summaries.db');
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  db.pragma('journal_mode = WAL');

  // Schema version check
  const EXPECTED_SCHEMA_VERSION = 1;
  try {
    const [{ version }] = db.prepare('PRAGMA user_version').all() as [{ version: number }];
    if (version && version !== EXPECTED_SCHEMA_VERSION) {
      console.warn(`[sqlite] Schema version mismatch: expected ${EXPECTED_SCHEMA_VERSION}, got ${version}`);
    }
  } catch { /* pragma may not exist on older dbs */ }

  cached = db;
  return db;
}

export function openConversationDbWrite(): Database.Database {
  const dbPath = path.join(getConfig().agyHome, 'conversation_summaries.db');
  const db = new Database(dbPath, { readonly: false, fileMustExist: true });
  db.pragma('journal_mode = WAL');
  return db;
}

export function closeConversationDb(): void {
  if (cached) {
    cached.close();
    cached = null;
  }
}
