import fs from 'fs';
import path from 'path';
import { getConfig } from '../config';
import { openConversationDbWrite, openConversationDb, ConversationSummary } from '../db/sqliteClient';
import { readCustomTitles } from './sessionMetaService';

export function cleanUserPrompt(raw: string): string {
  let text = raw;
  const reqMatch = text.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i);
  if (reqMatch) {
    text = reqMatch[1];
  }
  // Strip XML-like tags if any
  text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text;
}

export function extractSessionSummary(
  conversationId: string,
  fallbackWorkspace?: string
): ConversationSummary | null {
  const agyHome = getConfig().agyHome;
  const brainDir = path.join(agyHome, 'brain', conversationId);
  const logFile = path.join(brainDir, '.system_generated', 'logs', 'transcript.jsonl');

  if (!fs.existsSync(logFile)) {
    return null;
  }

  let title = '';
  let preview = '';
  let stepCount = 0;
  let workspaceUri = fallbackWorkspace || '';
  let lastUserInputTime = new Date().toISOString();
  let lastModifiedTime = new Date().toISOString();

  try {
    const stats = fs.statSync(logFile);
    lastModifiedTime = stats.mtime.toISOString();
  } catch {}

  try {
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);
    stepCount = lines.length;

    for (const line of lines) {
      try {
        const row = JSON.parse(line);
        if (row.type === 'USER_INPUT' || row.source === 'USER_EXPLICIT') {
          if (!title && row.content) {
            const clean = cleanUserPrompt(row.content);
            if (clean) {
              title = clean.slice(0, 100);
              preview = clean.slice(0, 200);
            }
          }
          if (row.created_at) {
            lastUserInputTime = row.created_at;
          }
        }
        // Extract workspace if present in init event cwd
        if (row.event === 'init' && row.init?.cwd && !workspaceUri) {
          workspaceUri = row.init.cwd;
        }
        // Extract workspace if present in tool calls
        if (row.tool_calls && Array.isArray(row.tool_calls)) {
          for (const tc of row.tool_calls) {
            const rawPath = tc.args?.DirectoryPath || tc.args?.Cwd || tc.args?.SearchPath || tc.args?.AbsolutePath;
            if (rawPath && typeof rawPath === 'string') {
              const cleanPath = rawPath.replace(/\\"/g, '').replace(/"/g, '').trim();
              if (cleanPath.startsWith('/') && !cleanPath.includes('.gemini/antigravity-cli')) {
                if (!workspaceUri || workspaceUri === process.cwd() || workspaceUri.includes('agy-webui')) {
                  workspaceUri = cleanPath;
                }
              }
            }
          }
        }
      } catch {}
    }
  } catch (e) {
    console.warn(`Failed to parse transcript for ${conversationId}:`, e);
  }

  if (!title) {
    title = `会话 ${conversationId.slice(0, 8)}`;
  }
  if (!workspaceUri) {
    workspaceUri = fallbackWorkspace || process.cwd();
  }
  const cleanWs = workspaceUri.startsWith('file://') ? workspaceUri : `file://${workspaceUri}`;

  return {
    conversation_id: conversationId,
    title,
    preview: preview || title,
    step_count: stepCount,
    last_modified_time: lastModifiedTime,
    workspace_uris: [cleanWs],
    status: 'COMPLETED',
    source: 'CLI',
    project_id: '',
    agent_name: '',
    parent_conversation_id: '',
    nesting_depth: 0,
    not_fully_idle: false,
    killed: false,
    last_user_input_time: lastUserInputTime
  };
}

export function upsertConversationSummary(summary: ConversationSummary): void {
  try {
    const customTitles = readCustomTitles();
    const customTitle = customTitles.get(summary.conversation_id);
    const titleToSave = customTitle || summary.title;

    const db = openConversationDbWrite();
    const stmt = db.prepare(`
      INSERT INTO conversation_summaries (
        conversation_id, title, preview, step_count, last_modified_time,
        workspace_uris, status, source, project_id, agent_name,
        parent_conversation_id, nesting_depth, not_fully_idle, killed,
        last_user_input_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(conversation_id) DO UPDATE SET
        title = CASE
          WHEN ? != '' THEN ?
          WHEN conversation_summaries.title != '' THEN conversation_summaries.title
          ELSE excluded.title
        END,
        preview = excluded.preview,
        step_count = excluded.step_count,
        last_modified_time = excluded.last_modified_time,
        workspace_uris = excluded.workspace_uris,
        last_user_input_time = excluded.last_user_input_time
    `);

    stmt.run(
      summary.conversation_id,
      titleToSave,
      summary.preview,
      summary.step_count,
      summary.last_modified_time,
      JSON.stringify(summary.workspace_uris),
      summary.status,
      summary.source,
      summary.project_id,
      summary.agent_name,
      summary.parent_conversation_id,
      summary.nesting_depth,
      summary.not_fully_idle ? 1 : 0,
      summary.killed ? 1 : 0,
      summary.last_user_input_time,
      customTitle || '',
      customTitle || ''
    );
    db.close();
  } catch (e) {
    console.error(`Failed to upsert conversation summary for ${summary.conversation_id}:`, e);
  }
}

export function syncUnindexedDiskSessions(): void {
  const agyHome = getConfig().agyHome;
  const brainDir = path.join(agyHome, 'brain');
  const conversationsDir = path.join(agyHome, 'conversations');
  if (!fs.existsSync(brainDir)) return;

  try {
    const db = openConversationDb();
    const existingRows = db.prepare('SELECT conversation_id FROM conversation_summaries').all() as any[];
    const existingSet = new Set<string>(existingRows.map((r) => r.conversation_id));

    // 1. Prune ghost sessions (rows in SQLite whose disk files were deleted)
    const ghostIds: string[] = [];
    for (const id of existingSet) {
      const hasBrain = fs.existsSync(path.join(brainDir, id));
      const hasDb = fs.existsSync(path.join(conversationsDir, `${id}.db`));
      if (!hasBrain && !hasDb) {
        ghostIds.push(id);
      }
    }

    if (ghostIds.length > 0) {
      try {
        const writeDb = openConversationDbWrite();
        const deleteStmt = writeDb.prepare('DELETE FROM conversation_summaries WHERE conversation_id = ?');
        for (const ghostId of ghostIds) {
          deleteStmt.run(ghostId);
          existingSet.delete(ghostId);
        }
        writeDb.close();
        console.log(`[SessionSync] Pruned ${ghostIds.length} ghost session(s) from SQLite index.`);
      } catch (err) {
        console.warn('Failed to prune ghost sessions:', err);
      }
    }

    // 2. Index any new/unindexed brain directories on disk
    const entries = fs.readdirSync(brainDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.length > 10) {
        const convId = entry.name;
        if (!existingSet.has(convId)) {
          const summary = extractSessionSummary(convId);
          if (summary) {
            upsertConversationSummary(summary);
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to sync disk sessions:', e);
  }
}
