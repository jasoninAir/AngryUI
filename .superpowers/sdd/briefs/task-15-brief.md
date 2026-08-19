# Task 1.5: settings.json chmod 600 + security note

## Context
Task 1.5 of the AngryUI audit fix plan. Fixes HIGH issue C-02.
Project: /Users/jason/myprojects/angryui
Current HEAD: 605f649

## Problem from Audit
- **C-02**: `settings.json` written with default umask — other local users can read the permission whitelist

## Goal
1. After atomic `renameSync` in `writeSettings()`, chmod to 0o600
2. Add JSDoc security note pointing to OS keychain upgrade path

## File to Modify

### `server/services/settingsService.ts`

After line `renameSync(tmp, file)` in `writeSettings()`, add:
```typescript
// SECURITY: restrict to owner-only after write — prevents other local users reading whitelist patterns
try { chmodSync(file, 0o600); } catch { /* ignore on Windows */ }
```

And add JSDoc on the function:
```typescript
/**
 * SECURITY NOTE: stores the "Always Allow" permission whitelist in plaintext.
 * chmod 600 applied after each write. For stronger protection, consider OS keychain
 * (Keychain/macOS, DPAPI/Windows, libsecret/Linux) — see docs/angryui-roadmap.md Phase 3.
 */
```

## Test Strategy
- `npm test -- --run` — all tests must pass (no behavior change, just file permissions)

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit with message:
   "fix(security): settings.json written with chmod 600 after atomic write

   - File permissions restricted to owner after every update
   - Documents OS keychain upgrade path for Phase 3
   - Fixes C-02 (HIGH)"

## Global Constraints
- TypeScript strict mode ON
- Node 18+
- MIT license
- `npm test -- --run` must pass
- No new dependencies
