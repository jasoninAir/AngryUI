import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HTTPServer } from 'http';
import { checkToken } from '../utils/tokens';

export function attachWsServer(httpServer: HTTPServer, token: string | null): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/ws')) {
      socket.destroy();
      return;
    }
    if (!checkToken(req, token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  return wss;
}
