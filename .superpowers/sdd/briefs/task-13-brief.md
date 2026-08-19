# Task 1.3: Graceful shutdown kills all node-pty children

## Context
Task 1.3 of the AngryUI audit fix plan. Fixes HIGH issue D-04.
Project: /Users/jason/myprojects/angryui
Current HEAD: 605f649

## Problem from Audit
- **D-04**: `server/index.ts` graceful shutdown doesn't kill node-pty child processes
- When user restarts AngryUI, leftover `shell`/`bash`/`node` processes may persist
- The ptyManager exists but has no `killAll()` method

## Goal
1. Add static session registry to `PtyManager` (`register`/`unregister`/`killAll`)
2. Call `PtyManager.killAll()` in SIGINT/SIGTERM handler
3. Force-exit timeout: 10s (was 5s)

## Files to Modify

### 1. `server/services/ptyManager.ts`
Add to `PtyManager` class:
```typescript
private static activeSessions = new Map<string, PtySession>();

static register(id: string, session: PtySession): void { this.activeSessions.set(id, session); }
static unregister(id: string): void { this.activeSessions.delete(id); }
static killAll(): void {
  for (const [, s] of this.activeSessions) { try { s.kill(); } catch {} }
  this.activeSessions.clear();
}
```

Update `spawn()` to call `PtyManager.register(conversationId, session)`.
Add `proc.onExit(() => PtyManager.unregister(conversationId))` inside spawn.

### 2. `server/ws/handlers/tuiHandler.ts`
Import `PtyManager` and call `PtyManager.register` after creating a session, and `PtyManager.unregister` on exit.

### 3. `server/index.ts` — SHUTDOWN HANDLER (around lines 76-84)
```typescript
// Add import at top:
import { PtyManager } from './services/ptyManager';

// Replace shutdown function:
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  discovery.stop();
  PtyManager.killAll();        // Kill all pty sessions first
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();  // 10s force-exit (was 5s)
};
```

## Test Strategy
- `npm test -- --run` — all tests must pass
- Manual: start AngryUI, open WebTTY, send SIGTERM — verify pty processes are gone

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit with message:
   "fix(reliability): graceful shutdown kills all node-pty sessions

   - PtyManager.register/unregister tracks all active sessions
   - SIGTERM/SIGINT calls killAll() before closing HTTP server
   - 10s force-exit guard (up from 5s) allows pty cleanup to finish
   - Fixes D-04 (HIGH)"

## Global Constraints
- TypeScript strict mode ON
- Node 18+
- MIT license
- `npm test -- --run` must pass
- No new dependencies
