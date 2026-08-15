import { WebSocket } from 'ws';
import { PtyManager } from '../../services/ptyManager';

export function handleTuiConnection(ws: WebSocket, conversationId: string): void {
  const manager = new PtyManager();
  const session = manager.spawn(conversationId);

  session.onData((data) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'tui:data', data }));
  });
  session.onExit(() => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'tui:exit' }));
  });

  ws.on('message', (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.type === 'tui:input') session.write(msg.data);
    if (msg.type === 'tui:resize') session.resize(msg.cols, msg.rows);
  });

  ws.on('close', () => {
    session.kill();
  });
}
