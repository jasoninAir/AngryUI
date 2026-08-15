import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HTTPServer } from 'http';
import { checkToken } from '../utils/tokens';
import { handleChatConnection } from './handlers/chatHandler';
import { ConversationIndex } from '../db/conversationIndex';

export function attachWsServer(
  httpServer: HTTPServer,
  token: string | null,
  index: ConversationIndex
): WebSocketServer {
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

  wss.on('connection', (ws: WebSocket, req: any) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname.startsWith('/ws/tui/')) {
      // TUI handler is mounted in Task 15
      return;
    }
    handleChatConnection(ws, index);
  });

  return wss;
}
