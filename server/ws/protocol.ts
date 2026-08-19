import { z } from 'zod';

export const ClientMsgSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('chat:subscribe'), conversationId: z.string() }).strict(),
  z.object({
    type: z.literal('chat:send'),
    conversationId: z.string(),
    payload: z.object({
      message: z.string().min(1),
      model: z.string().optional(),
      effort: z.enum(['low', 'medium', 'high']).optional(),
      workspace: z.string().optional(),
      // NOTE: dangerouslySkipPermissions intentionally ABSENT — server-controlled only
    }).strict(),
  }).strict(),
  z.object({ type: z.literal('chat:unsubscribe'), conversationId: z.string() }).strict(),
  z.object({ type: z.literal('chat:cancel'), conversationId: z.string() }).strict(),
  z.object({ type: z.literal('chat:quota') }).strict(),
  z.object({ type: z.literal('chat:set_status'), conversationId: z.string(), payload: z.object({ status: z.string() }).strict() }).strict(),
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
