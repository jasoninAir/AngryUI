import { WebSocket } from 'ws';
import { TurnRunner } from '../../services/turnRunner';
import { ConversationIndex } from '../../db/conversationIndex';

interface ClientMsg {
  type: string;
  conversationId?: string;
  payload?: any;
}

interface ServerMsg {
  type: string;
  conversationId: string;
  payload: any;
  timestamp: number;
}

const TURN_TIMEOUT_MS = 5 * 60 * 1000;

export function handleChatConnection(ws: WebSocket, _index: ConversationIndex): void {
  const runner = new TurnRunner();
  const activeTurns = new Map<string, { abort: () => void }>();

  const send = (msg: ServerMsg) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };

  ws.on('message', (data) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (msg.type === 'chat:send' && msg.conversationId && msg.payload) {
      const convId = msg.conversationId;
      const { message, model, effort, dangerouslySkipPermissions } = msg.payload;

      const handle = runner.spawn({
        conversationId: convId,
        message,
        model,
        effort,
        dangerouslySkipPermissions
      });

      activeTurns.set(convId, { abort: handle.abort });

      const timeout = setTimeout(() => handle.abort(), TURN_TIMEOUT_MS);

      send({ type: 'session:status', conversationId: convId, payload: { state: 'RUNNING' }, timestamp: Date.now() });

      (async () => {
        try {
          for await (const ev of handle.events) {
            if (ev.type === 'step_update' && ev.step_type === 'unknown') {
              send({
                type: 'chat:interactive_prompt',
                conversationId: convId,
                payload: { reason: 'unknown_step' },
                timestamp: Date.now()
              });
            } else {
              send({ type: 'chat:stream', conversationId: convId, payload: ev, timestamp: Date.now() });
            }
          }
          send({ type: 'chat:done', conversationId: convId, payload: {}, timestamp: Date.now() });
        } catch (e: any) {
          send({ type: 'chat:error', conversationId: convId, payload: { message: e.message }, timestamp: Date.now() });
        } finally {
          clearTimeout(timeout);
          activeTurns.delete(convId);
          send({ type: 'session:status', conversationId: convId, payload: { state: 'IDLE' }, timestamp: Date.now() });
        }
      })();
    }

    if (msg.type === 'chat:cancel' && msg.conversationId) {
      const turn = activeTurns.get(msg.conversationId);
      if (turn) {
        turn.abort();
        activeTurns.delete(msg.conversationId);
        send({ type: 'session:status', conversationId: msg.conversationId, payload: { state: 'IDLE' }, timestamp: Date.now() });
      }
    }

    if (msg.type === 'chat:quota') {
      runner.quota().then((output) => {
        send({ type: 'quota:result', conversationId: 'system', payload: { output }, timestamp: Date.now() });
      });
    }
  });

  ws.on('close', () => {
    // Do NOT abort active turns — server keeps processes alive in background.
  });
}
