import express from 'express';
import http from 'http';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getConfig } from './config';
import { attachWsServer } from './ws/wsServer';
import { requireAuth } from './utils/tokens';
import { ConversationIndex } from './db/conversationIndex';
import { createProjectsRouter } from './routes/projects';
import { createSettingsRouter } from './routes/settings';
import { createUploadRouter } from './routes/upload';
import path from 'path';
import fs from 'fs';
import { DiscoveryService } from './services/discoveryService';

const config = getConfig();
const app = express();

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

// Body limits — 1MB for JSON (50mb was a DoS vector)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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

// Apply auth middleware to all /api/* routes from here on
if (config.token) {
  app.use('/api', requireAuth(config.token));
}

// Bootstrap conversation index and routers
const index = new ConversationIndex();
index.load();
app.use('/api', createProjectsRouter(index));
app.use('/api', createSettingsRouter());
app.use('/api', createUploadRouter());

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
  console.log(`[Discovery] ${event.type}: ${event.conversation_id}`);
});

const httpServer = http.createServer(app);
attachWsServer(httpServer, config.token, index);

httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${config.port} is already in use by another process.`);
    console.error(`💡 Tip: You can specify a different port using:`);
    console.error(`   npm start -- --port <available-port>`);
    console.error(`   or: AGY_WEBUI_PORT=<available-port> npm start\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

httpServer.listen(config.port, config.host, () => {
  console.log(`AngryUI server listening on http://${config.host}:${config.port}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down server...`);
  discovery.stop();
  httpServer.close(() => process.exit(0));
  // Force exit after 5s if connections refuse to close
  setTimeout(() => process.exit(1), 5000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
