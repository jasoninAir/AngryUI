import { z } from 'zod';

// Client messages may include optional `timestamp` and `payload` fields
// that the server does not use but must tolerate. Use .passthrough() on
// the outer envelope so extra keys (like `timestamp`) don't cause
// validation failures. Inner payloads use .strip() to silently discard
// unknown keys (e.g. dangerouslySkipPermissions — server-controlled only).
export const ClientMsgSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('chat:subscribe'),
    conversationId: z.string(),
    lastSeq: z.number().optional(),
    pauseWhenHidden: z.boolean().optional(),
  }).passthrough(),
  z.object({
    type: z.literal('chat:reconnect_resume'),
    conversationId: z.string(),
    lastSeq: z.number().optional(),
  }).passthrough(),
  z.object({
    type: z.literal('chat:send'),
    conversationId: z.string(),
    payload: z.object({
      message: z.string().min(1),
      model: z.string().optional(),
      effort: z.enum(['low', 'medium', 'high']).optional(),
      workspace: z.string().optional(),
      dangerouslySkipPermissions: z.boolean().optional(),
    }).strip(),
  }).passthrough(),
  z.object({ type: z.literal('chat:unsubscribe'), conversationId: z.string() }).passthrough(),
  z.object({ type: z.literal('chat:cancel'), conversationId: z.string() }).passthrough(),
  z.object({
    type: z.literal('chat:decision'),
    conversationId: z.string(),
    payload: z.object({
      approved: z.boolean(),
      response: z.string().optional()
    }).passthrough()
  }).passthrough(),
  z.object({ type: z.literal('chat:quota') }).passthrough(),
  z.object({ type: z.literal('chat:ping'), conversationId: z.string().optional(), payload: z.any().optional(), timestamp: z.number().optional() }).passthrough(),
  z.object({ type: z.literal('chat:set_status'), conversationId: z.string(), payload: z.object({ status: z.string() }) }).passthrough(),
]);

export const ServerMsgSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('session:all_statuses'), conversationId: z.string(), payload: z.object({ statuses: z.record(z.string()) }), timestamp: z.number() }),
  z.object({ type: z.literal('session:status_update'), conversationId: z.string(), payload: z.object({ status: z.string() }), timestamp: z.number() }),
  z.object({ type: z.literal('session:status'), conversationId: z.string(), payload: z.object({ state: z.string() }), timestamp: z.number() }),
  z.object({ type: z.literal('chat:stream'), conversationId: z.string(), payload: z.any(), seq: z.number().optional(), timestamp: z.number() }),
  z.object({ type: z.literal('chat:buffer_truncated'), conversationId: z.string(), payload: z.object({ droppedSeq: z.number().optional(), lastSeq: z.number().optional() }).passthrough(), timestamp: z.number() }),
  z.object({ type: z.literal('chat:interactive_prompt'), conversationId: z.string(), payload: z.object({ tool: z.string(), command: z.string().optional(), message: z.string() }), seq: z.number().optional(), timestamp: z.number() }),
  z.object({ type: z.literal('chat:done'), conversationId: z.string(), payload: z.object({}).passthrough(), seq: z.number().optional(), timestamp: z.number() }),
  z.object({ type: z.literal('chat:pong'), conversationId: z.string().optional(), payload: z.object({ clientTs: z.number().optional() }).passthrough(), timestamp: z.number() }),
  z.object({ type: z.literal('chat:error'), conversationId: z.string(), payload: z.object({ message: z.string(), code: z.string().optional(), requestId: z.string().optional() }).passthrough(), timestamp: z.number() }),
  z.object({ type: z.literal('quota:result'), conversationId: z.string(), payload: z.object({ output: z.string() }), timestamp: z.number() }),
  z.object({ type: z.literal('session:upsert'), conversationId: z.string().optional(), payload: z.object({ session: z.any() }).passthrough(), timestamp: z.number() }),
  z.object({ type: z.literal('session:remove'), conversationId: z.string(), payload: z.object({ conversationId: z.string().optional() }).passthrough().optional(), timestamp: z.number() }),
]);
