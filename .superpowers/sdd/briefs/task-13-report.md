# Task 1.3 Report: Graceful shutdown kills all node-pty children

## Status: COMPLETED

## Summary
Implemented graceful shutdown to kill all node-pty child processes when AngryUI terminates.

## Changes Made

### 1. server/services/ptyManager.ts
- Added static `activeSessions` Map to track all PTY sessions
- Added `static register(id, session)` - registers new PTY sessions
- Added `static unregister(id)` - removes sessions on exit
- Added `static killAll()` - kills all tracked sessions
- Modified `spawn()` to call register/unregister at appropriate lifecycle points

### 2. server/index.ts
- Imported `PtyManager` from services
- Modified shutdown handler to call `PtyManager.killAll()` before closing HTTP server
- Changed force-exit timeout from 5s to 10s

## Test Results
```
Test Files  26 passed (26)
Tests       87 passed (87)
Duration    14.01s
```

## Commit
The changes were included in commit `67075a8`:
```
fix(ops): structured pino logging + requestId on every error response
```

With task-specific changes:
- PtyManager.register/unregister tracks all active sessions
- SIGTERM/SIGINT calls killAll() before closing HTTP server
- 10s force-exit guard (up from 5s) allows pty cleanup to finish
- Fixes D-04 (HIGH)

## Files Modified
- `/Users/jason/myprojects/angryui/server/services/ptyManager.ts`
- `/Users/jason/myprojects/angryui/server/index.ts`
