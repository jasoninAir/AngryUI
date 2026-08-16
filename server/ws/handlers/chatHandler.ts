import { WebSocket } from 'ws';
import { TurnRunner } from '../../services/turnRunner';
import { ConversationIndex } from '../../db/conversationIndex';
import { AgyEvent } from '../../utils/streamParser';
import { conversationHub } from '../conversationHub';

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
  const subscriptions = new Map<string, () => void>();

  const send = (msg: ServerMsg) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };

  /**
   * Subscribe to a conversation's events on the hub and forward them to the
   * WebSocket. This decouples event publication from one connection so that
   * multi-device / reconnect flows work.
   */
  const subscribeConversation = (convId: string) => {
    if (subscriptions.has(convId)) return;
    const unsubscribe = conversationHub.subscribe(convId, (event: AgyEvent) => {
      send({ type: 'chat:stream', conversationId: convId, payload: event, timestamp: Date.now() });
    });
    subscriptions.set(convId, unsubscribe);
  };

  const unsubscribeConversation = (convId: string) => {
    const u = subscriptions.get(convId);
    if (u) {
      u();
      subscriptions.delete(convId);
    }
  };

  ws.on('message', (data) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (msg.type === 'chat:subscribe' && msg.conversationId) {
      subscribeConversation(msg.conversationId);
      send({
        type: 'session:status',
        conversationId: msg.conversationId,
        payload: { state: 'IDLE' },
        timestamp: Date.now()
      });
      return;
    }

    if (msg.type === 'chat:unsubscribe' && msg.conversationId) {
      unsubscribeConversation(msg.conversationId);
      return;
    }

    if (msg.type === 'chat:send' && msg.conversationId && msg.payload) {
      const convId = msg.conversationId;
      const { message, model, effort, dangerouslySkipPermissions, workspace } = msg.payload;

      // Subscribe the sender to the hub so they receive stream events
      subscribeConversation(convId);

      const handle = runner.spawn({
        conversationId: convId,
        message,
        model,
        effort,
        dangerouslySkipPermissions,
        cwd: workspace
      });

      activeTurns.set(convId, { abort: handle.abort });

      const timeout = setTimeout(() => handle.abort(), TURN_TIMEOUT_MS);

      send({ type: 'session:status', conversationId: convId, payload: { state: 'RUNNING' }, timestamp: Date.now() });

      (async () => {
        try {
          for await (const ev of handle.events) {
            conversationHub.publish(convId, ev);
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
    // Unsubscribe from all conversations, but DO NOT abort active turns.
    // Hub keeps the process alive for other subscribers (multi-device).
    for (const u of subscriptions.values()) u();
    subscriptions.clear();
  });
}
