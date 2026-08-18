# Task 0.1 Report: Lock down `dangerouslySkipPermissions` — server-side only

## Summary
Fixed CRITICAL security issue C-01: client-controlled `dangerouslySkipPermissions` field allowed bypassing all authorization checks.

## Changes Made

### 1. server/config.ts
- Added `allowSkipPermissions: boolean` to `Config` interface
- Added `--allow-skip-permissions` CLI flag (default: false)
- Added support for `AGY_WEBUI_ALLOW_SKIP_PERMISSIONS` env var
- Updated help text

### 2. server/services/turnRunner.ts
- Removed `dangerouslySkipPermissions?: boolean` from `TurnOptions` interface
- Changed spawn args to use `getConfig().allowSkipPermissions` instead of client-controlled option

### 3. server/ws/handlers/chatHandler.ts
- Removed `dangerouslySkipPermissions` from destructuring client payload
- Removed `dangerouslySkipPermissions` from spawn call options

### 4. tests/server/chatHandler.bypass.test.ts (NEW)
- Regression test that verifies `TurnRunner.spawn` is NEVER called with `dangerouslySkipPermissions`

## Test Results
- Regression test: PASSED (previously failed before fix)
- All 84 tests: PASSED (no regressions)
- Commit: 0efbf21

## Security Impact
- Client payload `dangerouslySkipPermissions` field is now silently ignored
- Only server-side config (`AGY_WEBUI_ALLOW_SKIP_PERMISSIONS` env/flag) can enable skip permissions
- Fixes C-01 (CRITICAL) vulnerability
