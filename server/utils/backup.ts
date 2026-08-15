import { copyFileSync } from 'fs';

export function backupFile(target: string): void {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${target}.bak.${ts}`;
  copyFileSync(target, backup);
}
