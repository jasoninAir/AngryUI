import express from 'express';
import http from 'http';
import cors from 'cors';
import { getConfig } from './config';
import { attachWsServer } from './ws/wsServer';

const config = getConfig();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', agyHome: config.agyHome });
});

const httpServer = http.createServer(app);
attachWsServer(httpServer, config.token);

httpServer.listen(config.port, config.host, () => {
  console.log(`AGY Web UI server listening on ${config.host}:${config.port}`);
});
