import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
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
