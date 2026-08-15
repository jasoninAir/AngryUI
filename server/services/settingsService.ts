import { readFileSync, writeFileSync, existsSync, renameSync } from 'fs';
import path from 'path';
import { getConfig } from '../config';
import { backupFile } from '../utils/backup';

interface SettingsFile {
  permissions?: { allow?: string[] };
  [key: string]: any;
}

export function readSettings(): SettingsFile {
  const file = path.join(getConfig().agyHome, 'settings.json');
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, 'utf-8'));
}

/**
 * Atomic write: write to a temp file, then rename.
 * Guarantees settings.json is never half-written, even on crash or kill.
 * Backup is created before the atomic swap.
 */
export function writeSettings(s: SettingsFile): void {
  const file = path.join(getConfig().agyHome, 'settings.json');
  const tmp = `${file}.tmp`;
  backupFile(file);
  writeFileSync(tmp, JSON.stringify(s, null, 2), 'utf-8');
  renameSync(tmp, file);
}

export function getAllowedCommands(): string[] {
  return readSettings().permissions?.allow ?? [];
}

export function addAllowedCommand(pattern: string): void {
  const s = readSettings();
  if (!s.permissions) s.permissions = {};
  if (!s.permissions.allow) s.permissions.allow = [];
  if (!s.permissions.allow.includes(pattern)) {
    s.permissions.allow.push(pattern);
    writeSettings(s);
  }
}

export function removeAllowedCommand(pattern: string): void {
  const s = readSettings();
  if (!s.permissions?.allow) return;
  s.permissions.allow = s.permissions.allow.filter((p) => p !== pattern);
  writeSettings(s);
}
