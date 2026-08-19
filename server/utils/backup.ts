import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import path from 'path';

export function backupFile(target: string): void {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${target}.bak.${ts}`;
  copyFileSync(target, backup);
}

export function backupSqliteDb(dbPath: string, agyHome: string): void {
  const backupDir = path.join(agyHome, 'backups');
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dest = path.join(backupDir, `conversation_summaries.${stamp}.db`);
  try {
    copyFileSync(dbPath, dest);
    const files = readdirSync(backupDir).filter(f => f.startsWith('conversation_summaries.')).sort();
    files.slice(0, -7).forEach(f => unlinkSync(path.join(backupDir, f)));
  } catch (e) {
    console.error('[backup] SQLite backup failed:', e);
  }
}
