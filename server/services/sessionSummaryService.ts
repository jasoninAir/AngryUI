import fs from 'fs';
import path from 'path';
import { getConfig } from '../config';
import { openConversationDbWrite, openConversationDb, ConversationSummary } from '../db/sqliteClient';
import { readCustomTitles } from './sessionMetaService';
import { normalizeWorkspacePath, toFileUri } from '../utils/workspacePath';

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

export function buildSubagentParentMap(brainDir: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(brainDir)) return map;

  try {
    const entries = fs.readdirSync(brainDir);
    for (const dir of entries) {
      const logFile = path.join(brainDir, dir, '.system_generated', 'logs', 'transcript.jsonl');
      if (!fs.existsSync(logFile)) continue;
      try {
        const content = fs.readFileSync(logFile, 'utf-8');
        const regex = /Created the following subagents:[\s\S]*?(?:\\\"|")conversationId(?:\\\"|"):\s*(?:\\\"|")([a-f0-9-]{36})(?:\\\"|")/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const subId = match[1];
          if (subId && subId !== dir) {
            map.set(subId, dir);
          }
        }
      } catch {}
    }
  } catch {}
  return map;
}

export function extractSessionSummary(
  conversationId: string,
  fallbackWorkspace?: string,
  knownParentId?: string
): ConversationSummary | null {
  const agyHome = getConfig().agyHome;
  const brainDir = path.join(agyHome, 'brain', conversationId);
  const logFile = path.join(brainDir, '.system_generated', 'logs', 'transcript.jsonl');

  if (!fs.existsSync(logFile)) {
    return null;
  }

  // Check if SQLite already has an established canonical workspace for this session
  let existingWs = '';
  try {
    const db = openConversationDb();
    const existingRow = db
      .prepare('SELECT workspace_uris FROM conversation_summaries WHERE conversation_id = ?')
      .get(conversationId) as any;
    if (existingRow?.workspace_uris) {
      const uris = JSON.parse(existingRow.workspace_uris);
      if (Array.isArray(uris) && uris[0]) {
        const clean = uris[0].replace(/^file:\/\//, '');
        if (fs.existsSync(clean) && fs.statSync(clean).isDirectory()) {
          existingWs = clean;
        }
      }
    }
  } catch {}

  let title = '';
  let preview = '';
  let stepCount = 0;
  let workspaceUri = fallbackWorkspace || existingWs || '';
  let lastUserInputTime = new Date().toISOString();
  let lastModifiedTime = new Date().toISOString();
  let isSubagent = Boolean(knownParentId);
  let parentConversationId = knownParentId || '';

  try {
    const stats = fs.statSync(logFile);
    lastModifiedTime = stats.mtime.toISOString();
  } catch {}

  try {
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);
    stepCount = lines.length;

    // Detect Subagent checkpoint fingerprint in step 1 if not already known
    if (!isSubagent && lines.length > 1) {
      try {
        const row1 = JSON.parse(lines[1]);
        if (
          row1.source === 'SYSTEM' &&
          row1.type === 'CHECKPOINT' &&
          typeof row1.content === 'string' &&
          row1.content.includes('{{ CHECKPOINT 0 }}')
        ) {
          isSubagent = true;
        }
      } catch {}
    }

    for (const line of lines) {
      try {
        const row = JSON.parse(line);

        // Check for workspace declaration in <user_information> block
        if (typeof row.content === 'string' && row.content.includes('<user_information>')) {
          const match = row.content.match(
            /The user has \d+ active workspaces[\s\S]*?\[URI\] -> \[CorpusName\]:\s*(\/[^\s\n\r]+)/i
          );
          if (match && match[1]) {
            workspaceUri = match[1].trim();
          }
        }

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
      } catch {}
    }
  } catch (e) {
    console.warn(`Failed to parse transcript for ${conversationId}:`, e);
  }

  if (!title) {
    title = isSubagent ? `子任务 ${conversationId.slice(0, 8)}` : `会话 ${conversationId.slice(0, 8)}`;
  }
  if (!workspaceUri) {
    workspaceUri = fallbackWorkspace || existingWs || process.cwd();
  }

  // Canonicalize workspace path to prevent file paths or slight variances from splitting sessions
  let canonicalWs = workspaceUri;
  try {
    canonicalWs = normalizeWorkspacePath(workspaceUri);
  } catch {
    const cleaned = workspaceUri.replace(/^file:\/\//, '');
    canonicalWs = fs.existsSync(cleaned) && fs.statSync(cleaned).isFile() ? path.dirname(cleaned) : cleaned;
  }
  const cleanWs = toFileUri(canonicalWs);

  return {
    conversation_id: conversationId,
    title,
    preview: preview || title,
    step_count: stepCount,
    last_modified_time: lastModifiedTime,
    workspace_uris: [cleanWs],
    status: 'COMPLETED',
    source: isSubagent ? 'SUBAGENT' : 'CLI',
    project_id: '',
    agent_name: '',
    parent_conversation_id: parentConversationId,
    nesting_depth: isSubagent ? 1 : 0,
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
        workspace_uris = CASE
          WHEN conversation_summaries.workspace_uris != '' AND conversation_summaries.workspace_uris != '["file:///"]' AND conversation_summaries.workspace_uris != '[]'
          THEN conversation_summaries.workspace_uris
          ELSE excluded.workspace_uris
        END,
        parent_conversation_id = CASE
          WHEN excluded.parent_conversation_id != '' THEN excluded.parent_conversation_id
          ELSE conversation_summaries.parent_conversation_id
        END,
        nesting_depth = CASE
          WHEN excluded.nesting_depth > 0 THEN excluded.nesting_depth
          ELSE conversation_summaries.nesting_depth
        END,
        source = CASE
          WHEN excluded.source != '' THEN excluded.source
          ELSE conversation_summaries.source
        END,
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

export function syncUnindexedDiskSessions(force = false): void {
  const agyHome = getConfig().agyHome;
  const brainDir = path.join(agyHome, 'brain');
  const conversationsDir = path.join(agyHome, 'conversations');
  if (!fs.existsSync(brainDir) && !fs.existsSync(conversationsDir)) return;

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

    // 2. Build subagent mapping and backfill parent_conversation_id for subagents
    const subagentMap = fs.existsSync(brainDir) ? buildSubagentParentMap(brainDir) : new Map<string, string>();
    if (subagentMap.size > 0) {
      try {
        const writeDb = openConversationDbWrite();
        const updateSubagentStmt = writeDb.prepare(
          "UPDATE conversation_summaries SET parent_conversation_id = ?, nesting_depth = 1, source = 'SUBAGENT' WHERE conversation_id = ? AND (parent_conversation_id IS NULL OR parent_conversation_id = '')"
        );
        for (const [subId, parentId] of subagentMap.entries()) {
          updateSubagentStmt.run(parentId, subId);
        }
        writeDb.close();
      } catch (err) {
        console.warn('Failed to backfill subagents in SQLite:', err);
      }
    }

    // 3. Index brain directories on disk
    if (fs.existsSync(brainDir)) {
      const entries = fs.readdirSync(brainDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.length > 10) {
          const convId = entry.name;
          if (!existingSet.has(convId) || force) {
            const summary = extractSessionSummary(convId, undefined, subagentMap.get(convId));
            if (summary) {
              upsertConversationSummary(summary);
              existingSet.add(convId);
            }
          }
        }
      }
    }

    // 4. Index conversations/*.db files on disk
    if (fs.existsSync(conversationsDir)) {
      const convEntries = fs.readdirSync(conversationsDir);
      for (const f of convEntries) {
        if (f.endsWith('.db')) {
          const convId = f.replace(/\.db$/, '');
          if ((!existingSet.has(convId) || force) && convId.length > 10) {
            const summary = extractSessionSummary(convId, undefined, subagentMap.get(convId));
            if (summary) {
              upsertConversationSummary(summary);
              existingSet.add(convId);
            }
          }
        }
      }
    }

    // 5. Sanitize any legacy / invalid workspace URIs in SQLite
    sanitizeExistingWorkspaceUris();
  } catch (e) {
    console.error('Failed to sync disk sessions:', e);
  }
}

/**
 * Normalizes all workspace URIs stored in SQLite so that file paths or subpaths
 * are resolved to their canonical root directory, preventing session tree splitting.
 */
export function sanitizeExistingWorkspaceUris(): void {
  try {
    const db = openConversationDbWrite();
    const rows = db.prepare('SELECT conversation_id, workspace_uris FROM conversation_summaries').all() as any[];
    const updateStmt = db.prepare('UPDATE conversation_summaries SET workspace_uris = ? WHERE conversation_id = ?');

    let fixedCount = 0;
    for (const row of rows) {
      if (!row.workspace_uris) continue;
      let uris: string[] = [];
      try {
        uris = JSON.parse(row.workspace_uris);
      } catch {
        continue;
      }
      if (!Array.isArray(uris) || uris.length === 0 || !uris[0]) continue;

      const rawUri = uris[0];
      const cleanPath = rawUri.replace(/^file:\/\//, '').trim();

      try {
        let fixedPath = cleanPath;
        if (fs.existsSync(cleanPath)) {
          const stat = fs.statSync(cleanPath);
          if (stat.isFile()) {
            fixedPath = path.dirname(cleanPath);
          }
          fixedPath = fs.realpathSync(fixedPath);
        }
        const newUri = toFileUri(fixedPath);
        if (newUri !== rawUri) {
          updateStmt.run(JSON.stringify([newUri]), row.conversation_id);
          fixedCount++;
        }
      } catch {}
    }
    db.close();
    if (fixedCount > 0) {
      console.log(`[SessionSync] Sanitized and normalized ${fixedCount} workspace URIs in SQLite.`);
    }
  } catch (e) {
    console.warn('Failed to sanitize workspace URIs:', e);
  }
}
