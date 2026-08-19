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
