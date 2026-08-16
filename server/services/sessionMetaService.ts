import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync, rmSync } from 'fs';
import path from 'path';
import { getConfig } from '../config';

interface ArchiveMetaFile {
  archivedIds: string[];
}

function getMetaFilePath(): string {
  const dir = getConfig().webuiHome;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'archived-sessions.json');
}

export function readArchivedIds(): Set<string> {
  const filePath = getMetaFilePath();
  if (!existsSync(filePath)) {
    return new Set<string>();
  }
  try {
    const raw: ArchiveMetaFile = JSON.parse(readFileSync(filePath, 'utf-8'));
    return new Set(Array.isArray(raw.archivedIds) ? raw.archivedIds : []);
  } catch {
    return new Set<string>();
  }
}

export function writeArchivedIds(ids: Set<string>): void {
  const filePath = getMetaFilePath();
  const tmpPath = `${filePath}.tmp`;
  const data: ArchiveMetaFile = {
    archivedIds: Array.from(ids)
  };
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tmpPath, filePath);
}

export function setConversationArchived(conversationId: string, archived: boolean): void {
  const current = readArchivedIds();
  if (archived) {
    current.add(conversationId);
  } else {
    current.delete(conversationId);
  }
  writeArchivedIds(current);
}

export function isConversationArchived(conversationId: string): boolean {
  return readArchivedIds().has(conversationId);
}

/**
 * Permanently delete all local filesystem artifacts, conversation databases,
 * brain directories, and history entries associated with a conversation.
 */
export function deleteLocalSessionFiles(conversationId: string): void {
  const agyHome = getConfig().agyHome;

  // 1. Conversations database files and protobuf files
  const extensions = ['.db', '.db-shm', '.db-wal', '.pb'];
  for (const ext of extensions) {
    const filePath = path.join(agyHome, 'conversations', `${conversationId}${ext}`);
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (e) {
        console.warn(`Failed to delete file ${filePath}:`, e);
      }
    }
  }

  // 2. Brain directory (contains transcript, checkpoints, logs, scratch)
  const brainDir = path.join(agyHome, 'brain', conversationId);
  if (existsSync(brainDir)) {
    try {
      rmSync(brainDir, { recursive: true, force: true });
    } catch (e) {
      console.warn(`Failed to delete brain directory ${brainDir}:`, e);
    }
  }

  // 3. Presence file
  const presenceFile = path.join(agyHome, 'presence', `${conversationId}.json`);
  if (existsSync(presenceFile)) {
    try {
      unlinkSync(presenceFile);
    } catch {}
  }

  // 4. History log file (~/.gemini/antigravity-cli/history.jsonl)
  const historyPath = path.join(agyHome, 'history.jsonl');
  if (existsSync(historyPath)) {
    try {
      const content = readFileSync(historyPath, 'utf-8');
      const lines = content.split('\n');
      const filtered = lines.filter((line) => {
        if (!line.trim()) return false;
        try {
          const parsed = JSON.parse(line);
          if (parsed.conversationId === conversationId || parsed.conversation_id === conversationId) {
            return false;
          }
        } catch {
          if (line.includes(conversationId)) return false;
        }
        return true;
      });
      writeFileSync(historyPath, filtered.join('\n') + (filtered.length > 0 ? '\n' : ''), 'utf-8');
    } catch (e) {
      console.warn(`Failed to clean history.jsonl for ${conversationId}:`, e);
    }
  }
}
