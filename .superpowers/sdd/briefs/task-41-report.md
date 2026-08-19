# Task 4.1 Report: WS protocol zod schemas + contract tests

## Summary
Implemented formal WS protocol validation using Zod schemas at the entry point of the chat handler.

## Changes Made

### 1. Dependencies
- Added `zod` (v4.4.3) via `pnpm add zod`

### 2. Created `/server/ws/protocol.ts`
- `ClientMsgSchema` - discriminated union of all client message types:
  - `chat:subscribe`
  - `chat:send` (with strict payload validation, `dangerouslySkipPermissions` intentionally ABSENT)
  - `chat:unsubscribe`
  - `chat:cancel`
  - `chat:quota`
  - `chat:set_status`
- `ServerMsgSchema` - discriminated union of all server message types
- All objects use `.strict()` to reject unknown fields

### 3. Updated `/server/ws/handlers/chatHandler.ts`
- Added import for `ClientMsgSchema`
- Added validation at entry point (after JSON parsing):
  - Uses `safeParse()` for non-throwing validation
  - Sends `chat:error` with code `INVALID_MSG` on validation failure
  - Uses validated `safeMsg` for all subsequent processing

### 4. Created `/tests/contract/ws-protocol.test.ts`
- Tests for `chat:subscribe` serialization/deserialization
- Tests for minimal `chat:send` payload
- Tests that `dangerouslySkipPermissions` is rejected

### 5. Updated `/tests/server/chatHandler.bypass.test.ts`
- Updated existing test to verify rejection at entry point (not TurnRunner)
- Validates that invalid messages get `chat:error` response

## Test Results
```
Test Files  26 passed (26)
Tests       87 passed (87)
```

All unit tests pass. E2e tests require a running server.

## Commit
`a868973` - feat(contracts): WS protocol zod schemas + validation at entry point
