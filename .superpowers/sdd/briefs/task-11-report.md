# Task 1.1 Report: CORS whitelist + rate limiting + body 1MB limit

## Summary
Implemented security fixes for HIGH issues A-03, A-04, A-05 from the audit.

## Changes Made

### 1. Added express-rate-limit dependency
- Installed `express-rate-limit` package for rate limiting

### 2. Modified `server/config.ts`
- Added `corsOrigins: string[]` to Config interface
- Added `--cors-origins` CLI argument parsing
- Added `AGY_WEBUI_CORS_ORIGINS` env var support
- Updated help text with new option
- Default: same-origin only (empty array)

### 3. Modified `server/index.ts`
- **CORS**: Replaced open `cors()` with whitelist-based configuration
  - Uses `config.corsOrigins` array to validate origins
  - Default: same-origin only (`false` when no whitelist)
- **Body limit**: Reduced from 50MB to 1MB
  - `express.json({ limit: '1mb' })`
  - `express.urlencoded({ extended: true, limit: '1mb' })`
- **Rate limiting**: Added global rate limit
  - 500 requests per 15 minutes per IP
  - Returns `{ error: 'Too many requests', code: 'RATE_LIMITED' }` when exceeded

## Test Results
- All 84 tests pass
- Test command: `npx vitest run`

## Commit
```
0fd9b9f fix(security): CORS whitelist, rate limiting, body limit 50mb→1mb
```

## Files Modified
- `/Users/jason/myprojects/angryui/server/config.ts`
- `/Users/jason/myprojects/angryui/server/index.ts`
- `/Users/jason/myprojects/angryui/package.json` (dependency added)
