import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HTTPServer } from 'http';
import { checkToken } from '../utils/tokens';
import { handleChatConnection } from './handlers/chatHandler';
import { handleTuiConnection } from './handlers/tuiHandler';
import { ConversationIndex } from '../db/conversationIndex';

export function attachWsServer(
  httpServer: HTTPServer,
  token: string | null,
  index: ConversationIndex
): WebSocketServer {
  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) => {
      if (protocols.has('bearer')) return 'bearer';
      return false;
    }
  });

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

  wss.on('connection', (ws: WebSocket, req: any) => {
    // Propagate requestId to WS for logging (set by requestId middleware on HTTP request)
    (ws as any).requestId = (req as any).requestId;

    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname.startsWith('/ws/tui/')) {
      const conversationId = decodeURIComponent(url.pathname.replace('/ws/tui/', ''));
      handleTuiConnection(ws, conversationId, index);
      return;
    }

    // Ping/pong heartbeat: ping every 25s, terminate ghost connections if no pong received
    let isAlive = true;
    ws.on('pong', () => {
      isAlive = true;
    });

    const pingInterval = setInterval(() => {
      if (!isAlive) {
        ws.terminate();
        return;
      }
      isAlive = false;
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 25000);

    ws.on('close', () => {
      clearInterval(pingInterval);
    });

    handleChatConnection(ws, index);
  });

  return wss;
}

export function broadcastWsMessage(wss: WebSocketServer, msg: any): void {
  const str = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(str);
      } catch {}
    }
  });
}
