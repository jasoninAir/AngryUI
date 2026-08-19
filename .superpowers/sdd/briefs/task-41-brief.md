# Task 4.1: WS protocol zod schemas + contract tests

## Context
Task 4.1 of the audit fix plan. Fixes MEDIUM issue E-01.
Project: /Users/jason/myprojects/angryui

## Goal
Formalize the WS protocol with Zod schemas; add contract tests.

## Files to Create/Modify
- `server/ws/protocol.ts` — CREATE
- `server/ws/handlers/chatHandler.ts` — add validation at entry
- `tests/contract/ws-protocol.test.ts` — CREATE

## Changes

### server/ws/protocol.ts
```typescript
import { z } from 'zod';

export const ClientMsgSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('chat:subscribe'), conversationId: z.string() }),
  z.object({
    type: z.literal('chat:send'),
    conversationId: z.string(),
    payload: z.object({
      message: z.string().min(1),
      model: z.string().optional(),
      effort: z.enum(['low', 'medium', 'high']).optional(),
      workspace: z.string().optional(),
      // NOTE: dangerouslySkipPermissions intentionally ABSENT — server-controlled only
    }),
  }),
  z.object({ type: z.literal('chat:unsubscribe'), conversationId: z.string() }),
  z.object({ type: z.literal('chat:cancel'), conversationId: z.string() }),
  z.object({ type: z.literal('chat:quota') }),
  z.object({ type: z.literal('chat:set_status'), conversationId: z.string(), payload: z.object({ status: z.string() }) }),
]);

export const ServerMsgSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('session:all_statuses'), conversationId: z.string(), payload: z.object({ statuses: z.record(z.string()) }), timestamp: z.number() }),
  z.object({ type: z.literal('session:status_update'), conversationId: z.string(), payload: z.object({ status: z.string() }), timestamp: z.number() }),
  z.object({ type: z.literal('session:status'), conversationId: z.string(), payload: z.object({ state: z.string() }), timestamp: z.number() }),
  z.object({ type: z.literal('chat:stream'), conversationId: z.string(), payload: z.any(), timestamp: z.number() }),
  z.object({ type: z.literal('chat:interactive_prompt'), conversationId: z.string(), payload: z.object({ tool: z.string(), command: z.string().optional(), message: z.string() }), timestamp: z.number() }),
  z.object({ type: z.literal('chat:done'), conversationId: z.string(), payload: z.object({}), timestamp: z.number() }),
  z.object({ type: z.literal('chat:error'), conversationId: z.string(), payload: z.object({ message: z.string(), code: z.string().optional() }), timestamp: z.number() }),
]);
```

### server/ws/handlers/chatHandler.ts
At the top of `ws.on('message', ...)`, after parsing:
```typescript
const parsed = ClientMsgSchema.safeParse(msg);
if (!parsed.success) {
  send({ type: 'chat:error', conversationId: 'system', payload: { message: 'Invalid message format', code: 'INVALID_MSG' }, timestamp: Date.now() });
  return;
}
const safeMsg = parsed.data;
```

### tests/contract/ws-protocol.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import { ClientMsgSchema, ServerMsgSchema } from '../../server/ws/protocol';

describe('ClientMsgSchema round-trip', () => {
  it('chat:subscribe serializes and parses', () => {
    const msg = { type: 'chat:subscribe', conversationId: 'test' };
    const parsed = ClientMsgSchema.parse(msg);
    expect(parsed).toEqual(msg);
  });
  it('chat:send with minimal payload', () => {
    const msg = { type: 'chat:send', conversationId: 'test', payload: { message: 'hello' } };
    expect(() => ClientMsgSchema.parse(msg)).not.toThrow();
  });
  it('rejects chat:send with dangerouslySkipPermissions', () => {
    const msg = { type: 'chat:send', conversationId: 'test', payload: { message: 'hi', dangerouslySkipPermissions: true } };
    expect(() => ClientMsgSchema.parse(msg)).toThrow();
  });
});
```

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "feat(contracts): WS protocol zod schemas + validation at entry point"

## Global Constraints
New dep: zod (allowed — contract testing)
