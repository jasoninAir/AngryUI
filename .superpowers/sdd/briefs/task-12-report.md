# Task 1.2 Report: WS Exponential Backoff + Ping/Pong Heartbeat

## Summary
Implemented exponential backoff with jitter on client-side WebSocket reconnect and server-side ping/pong heartbeat to prevent zombie connections.

## Changes Made

### 1. Client: `src/hooks/useWebSocket.ts`
- Added `getBackoffDelay(attempt)` function with exponential backoff (2^n * 1s, capped at 30s) + jitter
- Added `reconnectAttemptRef` to track retry attempts
- Added `retryCount` state exposed via return value
- Modified `ws.on('open')` to reset retry count on successful connection
- Modified `ws.on('close')` to use exponential backoff delay instead of fixed 2s

### 2. Server: `server/ws/wsServer.ts`
- Added ping interval (every 25s) in connection handler
- Added `pong` handler to acknowledge client liveness
- Added cleanup on `close` to clear the ping interval

### 3. Tests: `tests/client/useWebSocket.test.ts`
- Created unit tests for `getBackoffDelay` function
- Tests verify: first attempt ~1000ms, second attempt ~2000ms, cap at 30000ms

## Test Results
- All 87 tests pass (26 test files)
- New test file: 3 test cases for backoff function

## Files Modified
- `src/hooks/useWebSocket.ts` - Complete rewrite of reconnect logic
- `server/ws/wsServer.ts` - Added ping/pong heartbeat
- `tests/client/useWebSocket.test.ts` - New test file

## Audit Issues Fixed
- **D-01**: Fixed 2s reconnect delay with exponential backoff
- **A-07/D-02**: Added server-side ping/pong heartbeat
