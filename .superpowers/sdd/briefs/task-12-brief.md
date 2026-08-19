# Task 1.2: WS exponential backoff + ping/pong heartbeat

## Context
Task 1.2 of the AngryUI audit fix plan. Fixes HIGH issues D-01 and A-07/D-02.
Project: /Users/jason/myprojects/angryui
Current HEAD: 0fd9b9f

## Problems from Audit
- **D-01**: `src/hooks/useWebSocket.ts:32` — fixed 2s reconnect delay, no exponential backoff
- **A-07/D-02**: No WebSocket ping/pong heartbeat — connections can go "zombie"

## Goal
1. Client: implement exponential backoff with jitter on reconnect
2. Client: expose `retryCount` via return value (for UI indicator)
3. Server: ping every 25s, disconnect dead connections at ~60s

## Files to Modify

### 1. `src/hooks/useWebSocket.ts` — COMPLETE REWRITE of reconnect logic

At the top of the file, add:
```typescript
const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const JITTER_MS = 500;

function getBackoffDelay(attempt: number): number {
  const exp = Math.min(INITIAL_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
  return Math.round(exp + Math.random() * JITTER_MS);
}
```

In the `connect` useCallback, add a `reconnectAttemptRef`:
```typescript
const reconnectAttemptRef = useRef(0);
```

Replace the `ws.on('close')` handler (around line 30-33):
```typescript
// BEFORE:
ws.on('close', () => {
  setReadyState(WebSocket.CLOSED);
  reconnectTimeoutRef.current = setTimeout(connect, 2000);
});

// AFTER:
ws.on('close', () => {
  setReadyState(WebSocket.CLOSED);
  const delay = getBackoffDelay(reconnectAttemptRef.current);
  reconnectAttemptRef.current += 1;
  reconnectTimeoutRef.current = setTimeout(connect, delay);
  setRetryCount(reconnectAttemptRef.current);
});
```

Add to `ws.on('open')` to reset on success:
```typescript
ws.on('open', () => {
  reconnectAttemptRef.current = 0;
  setRetryCount(0);
  // ... existing flush queue code
});
```

Add `retryCount` state and return it:
```typescript
const [retryCount, setRetryCount] = useState(0);
// ... in return:
return { send, lastMessage, readyState, retryCount };
```

### 2. `server/ws/wsServer.ts` — ADD ping/pong heartbeat

In the `wss.on('connection', ...)` handler (after line ~36), add:
```typescript
const pingInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) ws.ping();
}, 25000);  // 25 seconds

ws.on('pong', () => { /* client is alive */ });

ws.on('close', () => {
  clearInterval(pingInterval);
});
```

### 3. `tests/client/useWebSocket.test.ts` — CREATE (optional but nice-to-have)
Basic test that the backoff function returns correct values:
```typescript
import { describe, it, expect } from 'vitest';
import { getBackoffDelay } from '../../src/hooks/useWebSocket';

describe('getBackoffDelay', () => {
  it('starts at ~1000ms for first attempt', () => {
    const d = getBackoffDelay(0);
    expect(d).toBeGreaterThanOrEqual(1000);
    expect(d).toBeLessThanOrEqual(1500);  // 1000 + jitter
  });
  it('doubles for second attempt', () => {
    const d = getBackoffDelay(1);
    expect(d).toBeGreaterThanOrEqual(2000);
    expect(d).toBeLessThanOrEqual(2500);  // 2000 + jitter
  });
  it('caps at MAX_DELAY_MS (30000)', () => {
    const d = getBackoffDelay(20);
    expect(d).toBeLessThanOrEqual(30500);  // 30000 + jitter
  });
});
```

## Test Strategy
- Run `npm test -- --run` — all tests must pass
- The backoff function can be unit-tested independently

## Success Criteria
1. `npm test -- --run` → ALL tests pass
2. Commit with message:
   "fix(reliability): WS exponential backoff + server-side ping/pong

   - Client: 2^n * 1s backoff with jitter, capped at 30s
   - Retry count exposed via return value for UI indicator
   - Server pings every 25s, disconnects if no pong within 60s
   - Fixes D-01, A-07/D-02 (HIGH)"

## Global Constraints
- TypeScript strict mode ON
- Node 18+
- MIT license
- `npm test -- --run` must pass
- No new runtime dependencies
