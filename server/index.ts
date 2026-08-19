import express from 'express';
import http from 'http';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { getConfig } from './config';
import { attachWsServer } from './ws/wsServer';
import { requireAuth } from './utils/tokens';
import { ConversationIndex } from './db/conversationIndex';
import { createProjectsRouter } from './routes/projects';
import { createSettingsRouter } from './routes/settings';
import { createUploadRouter } from './routes/upload';
import { createAuthRouter } from './routes/auth';
import path from 'path';
import fs from 'fs';
import { DiscoveryService } from './services/discoveryService';
import { PtyManager } from './services/ptyManager';
import { logger, generateRequestId } from './utils/logger';

const config = getConfig();
const app = express();

// Request ID middleware
app.use((req, _res, next) => {
  (req as any).requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  next();
});

// HTTP request/response logging
app.use(pinoHttp({ logger }));

// CORS — restrict to explicit whitelist (default: same-origin only)
const corsOptions: cors.CorsOptions = config.corsOrigins.length > 0
  ? {
      origin: (origin, cb) => {
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
    }
  : false;  // same-origin when no whitelist
app.use(cors(corsOptions));

// Body limits — 512KB for standard JSON APIs (upload router handles file streaming/base64)
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));

// Rate limiting — global: 500 req/15min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
}));

// Public health endpoint (no auth required)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', agyHome: config.agyHome });
});

// Auth endpoints (public - no auth required)
app.use('/api', createAuthRouter(config.token));

// Apply auth middleware to all /api/* routes from here on
if (config.token) {
  app.use('/api', requireAuth(config.token));
}

// Bootstrap conversation index and routers
const index = new ConversationIndex();
index.load();

// Backup SQLite on startup
try {
  const { backupSqliteDb } = await import('./utils/backup');
  const dbPath = path.join(config.agyHome, 'conversation_summaries.db');
  backupSqliteDb(dbPath, config.agyHome);
} catch {}

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload rate limit exceeded', code: 'UPLOAD_RATE_LIMITED' }
});

app.use('/api', createProjectsRouter(index));
app.use('/api', createSettingsRouter());
app.use('/api', uploadLimiter, createUploadRouter());

// Global structured error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err, requestId: (req as any).requestId }, 'Unhandled server error');
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    requestId: (req as any).requestId
  });
});

// Serve static frontend assets in production mode
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start the discovery service to watch conversation_summaries.db and history.jsonl.
// Logs deltas; in later phases, this will broadcast over WebSocket.
const discovery = new DiscoveryService(index);
discovery.start((event) => {
  logger.info({ type: event.type, conversation_id: event.conversation_id }, '[Discovery]');
});

const httpServer = http.createServer(app);
attachWsServer(httpServer, config.token, index);

httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error({ port: config.port }, 'Port already in use');
    console.error(`\n❌ Error: Port ${config.port} is already in use by another process.`);
    console.error(`💡 Tip: You can specify a different port using:`);
    console.error(`   npm start -- --port <available-port>`);
    console.error(`   or: AGY_WEBUI_PORT=<available-port> npm start\n`);
    process.exit(1);
  } else {
    logger.error({ err }, 'Server error');
    console.error('Server error:', err);
    process.exit(1);
  }
});

httpServer.listen(config.port, config.host, () => {
  logger.info({ host: config.host, port: config.port }, 'AngryUI server listening');
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down server');
  discovery.stop();
  PtyManager.killAll();  // Kill all pty sessions first
  httpServer.close(() => process.exit(0));
  // Force exit after 10s if connections refuse to close
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
