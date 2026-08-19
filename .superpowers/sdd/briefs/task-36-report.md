# Task 3.6 Report: postinstall chmod guidance script

## Summary
Replaced silent `|| true` postinstall with a guidance script that checks and fixes node-pty spawn-helper permissions.

## Changes Made

### 1. package.json
- Changed `postinstall` from `"chmod +x node_modules/node-pty/prebuilds/*/* 2>/dev/null || true"` to `"node scripts/check-node-pty.js"`

### 2. scripts/check-node-pty.js (NEW)
- Created guidance script that:
  - Resolves node-pty package location
  - Checks each architecture's spawn-helper binary
  - If executable bit missing, adds it with chmod 0o755
  - Logs action taken or skips gracefully if node-pty not installed

## Test Results
```
Test Files  26 passed (26)
Tests       87 passed (87)
Duration    10.67s
```

## Status
- Tests: PASSED
- Commit: "fix(deps): postinstall replaced with check-node-pty.js guidance script"
