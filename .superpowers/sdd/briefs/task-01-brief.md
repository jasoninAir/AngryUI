# Task 0.1: Lock down `dangerouslySkipPermissions` — server-side only

## Context
This is the first task of the AngryUI audit fix plan. It fixes CRITICAL security issue C-01.

## Problem (from audit)
`server/ws/handlers/chatHandler.ts:97-104` accepts `dangerouslySkipPermissions` from the client
payload and passes it directly to the `agy` CLI subprocess. A hostile client, browser extension,
or MITM can send `dangerouslySkipPermissions: true` and bypass ALL authorization checks.
The server has `AGY_WEBUI_ALLOW_SKIP_PERMISSIONS` env/config but the client field overrides it.

## Goal
Remove client-controlled `dangerouslySkipPermissions` entirely. The server config
`AGY_WEBUI_ALLOW_SKIP_PERMISSIONS` (env var + CLI flag, default false) is the SOLE source
of truth. The client payload field must be silently ignored.

## Exact Files to Modify

### 1. `server/config.ts`
Add to `getConfig()` return type:
```typescript
allowSkipPermissions: boolean
```
Add CLI flag `--allow-skip-permissions` (default false) and env var `AGY_WEBUI_ALLOW_SKIP_PERMISSIONS`.

### 2. `server/services/turnRunner.ts`
- Remove `dangerouslySkipPermissions?: boolean` from `TurnOptions` interface (around line 7-14)
- Replace the direct usage at the spawn args (around line 63-68):
  - Remove `const skipPerms = Boolean(opts.dangerouslySkipPermissions);`
  - Replace with: `const allowSkip = getConfig().allowSkipPermissions;`
  - Change args to: `...(allowSkip ? ['--dangerously-skip-permissions'] : [])`
  - The child process env should NOT receive this as a CLI flag the client can control

### 3. `server/ws/handlers/chatHandler.ts`
Around line 93:
```typescript
// BEFORE:
const { message, model, effort, dangerouslySkipPermissions, workspace } = msg.payload;
// AFTER:
const { message, model, effort, workspace } = msg.payload;
```
And around lines 97-104:
```typescript
// BEFORE:
const handle = runner.spawn({ conversationId: convId, message, model, effort, dangerouslySkipPermissions, cwd: workspace });
// AFTER:
const handle = runner.spawn({ conversationId: convId, message, model, effort, cwd: workspace });
```

### 4. `tests/server/chatHandler.bypass.test.ts` — CREATE THIS FILE
Regression test. The test must verify that `TurnRunner.spawn` is NEVER called with
`dangerouslySkipPermissions` in its options, even when a malicious client sends it.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { handleChatConnection } from '../../server/ws/handlers/chatHandler';

describe('dangerouslySkipPermissions bypass prevention', () => {
  it('server must not pass dangerouslySkipPermissions from client payload to TurnRunner', async () => {
    const fakeWs = {
      send: vi.fn(),
      readyState: 1, // OPEN
      on: vi.fn(),
      close: vi.fn(),
    } as any;
    const fakeIndex = { applyDelta: vi.fn() } as any;

    let capturedOptions: any = null;
    vi.stubGlobal('TurnRunner', vi.fn().mockImplementation(() => ({
      spawn: (opts: any) => {
        capturedOptions = opts;
        return {
          abort: vi.fn(), pid: 1,
          events: { [Symbol.asyncIterator]: () => ({ next: () => Promise.resolve({ done: true }) }) }
        };
      },
      quota: () => Promise.resolve(''),
    })));

    handleChatConnection(fakeWs, fakeIndex);

    // Simulate the chat:send message with the forbidden field
    const msgHandler = vi.mocked(fakeWs.on).calls.find(c => c[0] === 'message')?.[1] as (data: any) => void;
    msgHandler(JSON.stringify({
      type: 'chat:send',
      conversationId: 'test-conv',
      payload: { message: 'hello', dangerouslySkipPermissions: true }
    }));

    // Server MUST NOT forward dangerouslySkipPermissions to TurnRunner
    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions.dangerouslySkipPermissions).toBeUndefined();
  });
});
```

## Test Command
```bash
npm test -- --run tests/server/chatHandler.bypass.test.ts
```

## Success Criteria
1. Test written → run → FAIL (because code still forwards the field)
2. Code changes applied → run test → PASS
3. `npm test -- --run` → ALL tests pass (no regressions in existing 70 tests)
4. `git add ... && git commit` with message:
   "fix(security): remove client-controlled dangerouslySkipPermissions

   - AGY_WEBUI_ALLOW_SKIP_PERMISSIONS env/config gate replaces client field
   - Client payload field silently ignored; TurnRunner never receives it
   - Regression test ensures field cannot be forwarded to child process
   - Fixes C-01 (CRITICAL)"

## Global Constraints (must respect)
- TypeScript strict mode ON
- Node 18+
- MIT license
- `npm test -- --run` must pass at end
- No new runtime dependencies
