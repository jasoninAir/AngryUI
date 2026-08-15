import express from 'express';
import http from 'http';
import cors from 'cors';
import { getConfig } from './config';
import { attachWsServer } from './ws/wsServer';
import { requireAuth } from './utils/tokens';

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

// Placeholder for /api/projects, /api/settings/* routers (Tasks 4-6, 13)

const httpServer = http.createServer(app);
attachWsServer(httpServer, config.token);

httpServer.listen(config.port, config.host, () => {
  console.log(`AGY Web UI server listening on ${config.host}:${config.port}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down server...`);
  httpServer.close(() => process.exit(0));
  // Force exit after 5s if connections refuse to close
  setTimeout(() => process.exit(1), 5000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
