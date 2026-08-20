import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  conversationId?: string;
  startTime?: number;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Runs a callback with the given request context.
 */
export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Returns the current request context if available.
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Generates a random request ID.
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
