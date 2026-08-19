import { WebSocket } from 'ws';
import { PtyManager } from '../../services/ptyManager';
import { ConversationIndex } from '../../db/conversationIndex';

export function handleTuiConnection(
  ws: WebSocket,
  conversationId: string,
  index?: ConversationIndex
): void {
  const manager = new PtyManager();
  const conv = index ? index.get(conversationId) : undefined;
  const session = manager.spawn(conversationId, conv?.workspace);

  session.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'tui:data', data }));
    }
  });

  session.onExit(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'tui:exit' }));
    }
  });

  ws.on('message', (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.type === 'tui:input' && msg.data !== undefined) {
      try {
        session.write(msg.data);
      } catch {}
    }
    if (msg.type === 'tui:resize' && typeof msg.cols === 'number' && typeof msg.rows === 'number') {
      try {
        session.resize(msg.cols, msg.rows);
      } catch {}
    }
  });

  ws.on('close', () => {
    try {
      session.kill();
    } catch {}
  });
}

