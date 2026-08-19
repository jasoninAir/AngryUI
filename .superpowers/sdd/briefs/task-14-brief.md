# Task 1.4: Structured pino logging + requestId on all errors

## Context
Task 1.4 of the AngryUI audit fix plan. Fixes HIGH issues D-05, E-03.
Project: /Users/jason/myprojects/angryui
Current HEAD: 605f649

## Problems from Audit
- **D-05**: Only `console.log`/`console.error` — no structured logging
- **E-03**: No requestId, error responses not normalized

## Goal
1. Add `pino` + `pino-http` for structured logging
2. Every request gets `X-Request-Id` header
3. All error responses: `{ error, code, requestId }`
4. Sensitive fields redacted from logs

## Files to Create/Modify

### 1. `server/utils/logger.ts` — CREATE
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  serializers: {
    req: (r) => ({ id: r.headers['x-request-id'], method: r.method, url: r.url }),
    res: (r) => ({ statusCode: r.statusCode, requestId: r.headers['x-request-id'] }),
  },
  base: { pid: process.pid },
});

export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
```

### 2. `server/index.ts` — MODIFY
```bash
npm install pino pino-http
```

Add imports and requestId middleware after `app` creation:
```typescript
import pinoHttp from 'pino-http';
import { logger, generateRequestId } from './utils/logger';

// Request ID middleware
app.use((req, _res, next) => {
  (req as any).requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  next();
});

// HTTP request/response logging
app.use(pinoHttp({ logger }));

// Replace console.log in startup:
httpServer.on('listening', () => {
  logger.info({ host: config.host, port: config.port }, 'AngryUI server listening');
});
```

### 3. `server/utils/tokens.ts` — MODIFY line ~23
```typescript
// BEFORE:
res.status(401).json({ error: 'Unauthorized' });

// AFTER:
res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED', requestId: (req as any).requestId });
```

### 4. `server/ws/handlers/chatHandler.ts` — MODIFY error handler
In the `catch` block (around line 131), add `code` and `requestId`:
```typescript
send({
  type: 'chat:error',
  conversationId: convId,
  payload: {
    message: e.message,
    code: 'TURN_ERROR',
    requestId: (ws as any).requestId,
  },
  timestamp: Date.now(),
});
```

## Test Strategy
- `npm test -- --run` — all tests must pass

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit with message:
   "fix(ops): structured pino logging + requestId on every error response

   - Pino logger replaces console.log/error throughout server
   - Every request gets X-Request-Id; errors return { error, code, requestId }
   - Authorization header and token fields redacted from logs
   - Fixes D-05, E-03 (HIGH)"

## Global Constraints
- TypeScript strict mode ON
- Node 18+
- MIT license
- `npm test -- --run` must pass
- New deps: pino, pino-http (allowed — ops improvement)
