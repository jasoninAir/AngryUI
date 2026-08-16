import express from 'express';
import http from 'http';
import cors from 'cors';
import { getConfig } from './config';
import { attachWsServer } from './ws/wsServer';
import { requireAuth } from './utils/tokens';
import { ConversationIndex } from './db/conversationIndex';
import { createProjectsRouter } from './routes/projects';
import { createSettingsRouter } from './routes/settings';
import path from 'path';
import fs from 'fs';
import { DiscoveryService } from './services/discoveryService';

const config = getConfig();
const app = express();
app.use(cors());
app.use(express.json());

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
