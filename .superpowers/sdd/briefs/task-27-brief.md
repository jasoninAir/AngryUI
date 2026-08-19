# Task 2.7: SQLite schema version check + auto-backup

## Context
Task 2.7 of the audit fix plan. Fixes MEDIUM issues D-03 / C-04.
Project: /Users/jason/myprojects/angryui

## Goal
Check schema version on DB open; backup SQLite on startup with 7-file retention.

## Files to Modify
- `server/db/sqliteClient.ts`
- `server/utils/backup.ts`
- `server/index.ts`

## Exact Changes

### server/db/sqliteClient.ts
After opening the DB (after line ~29):
```typescript
const EXPECTED_SCHEMA_VERSION = 1;
try {
  const [{ version }] = db.prepare('PRAGMA user_version').all() as [{ version: number }];
  if (version && version !== EXPECTED_SCHEMA_VERSION) {
    console.warn(`[sqlite] Schema version mismatch: expected ${EXPECTED_SCHEMA_VERSION}, got ${version}`);
  }
} catch { /* pragma may not exist on older dbs */ }
```

### server/utils/backup.ts
Add at the end:
```typescript
export function backupSqliteDb(dbPath: string, agyHome: string): void {
  const backupDir = path.join(agyHome, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dest = path.join(backupDir, `conversation_summaries.${stamp}.db`);
  try {
    fs.copyFileSync(dbPath, dest);
    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('conversation_summaries.')).sort();
    files.slice(0, -7).forEach(f => fs.unlinkSync(path.join(backupDir, f)));
  } catch (e) {
    console.error('[backup] SQLite backup failed:', e);
  }
}
```

### server/index.ts
After `index.load()` (around line 33):
```typescript
try {
  const { backupSqliteDb } = await import('./utils/backup');
  const dbPath = path.join(config.agyHome, 'conversation_summaries.db');
  backupSqliteDb(dbPath, config.agyHome);
} catch {}
```

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "fix(reliability): SQLite schema check + auto-backup with 7-file retention"

## Global Constraints
TypeScript strict ON · `npm test -- --run` must pass
