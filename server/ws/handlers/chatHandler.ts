import { WebSocket } from 'ws';
import { TurnRunner } from '../../services/turnRunner';
import { ConversationIndex } from '../../db/conversationIndex';
import { AgyEvent } from '../../utils/streamParser';
import { conversationHub, SessionState } from '../conversationHub';
import { extractSessionSummary, upsertConversationSummary } from '../../services/sessionSummaryService';
import { ClientMsgSchema } from '../protocol';

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

  // Send initial all active session statuses
  send({
    type: 'session:all_statuses',
    conversationId: 'system',
    payload: { statuses: conversationHub.getAllStatuses() },
    timestamp: Date.now()
  });

  // Listen to global status changes across any conversation
  const unsubGlobalStatus = conversationHub.onGlobalStatusChange((convId: string, status: SessionState) => {
    send({
      type: 'session:status_update',
      conversationId: convId,
      payload: { status },
      timestamp: Date.now()
    });
  });

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

    // Validate message against schema
    const parsed = ClientMsgSchema.safeParse(msg);
    if (!parsed.success) {
      send({ type: 'chat:error', conversationId: 'system', payload: { message: 'Invalid message format', code: 'INVALID_MSG' }, timestamp: Date.now() });
      return;
    }
    const safeMsg = parsed.data;

    if (safeMsg.type === 'chat:subscribe' && safeMsg.conversationId) {
      subscribeConversation(safeMsg.conversationId);
      const currentStatus = conversationHub.getStatus(safeMsg.conversationId);
      send({
        type: 'session:status',
        conversationId: safeMsg.conversationId,
        payload: { state: currentStatus },
        timestamp: Date.now()
      });
      return;
    }

    if (safeMsg.type === 'chat:unsubscribe' && safeMsg.conversationId) {
      unsubscribeConversation(safeMsg.conversationId);
      return;
    }

    if (safeMsg.type === 'chat:send' && safeMsg.conversationId && safeMsg.payload) {
      const convId = safeMsg.conversationId;
      const { message, model, effort, workspace } = safeMsg.payload;

      subscribeConversation(convId);

      const handle = runner.spawn({
        conversationId: convId,
        message,
        model,
        effort,
        cwd: workspace
      });

      activeTurns.set(convId, { abort: handle.abort });
      conversationHub.setStatus(convId, 'RUNNING');

      const timeout = setTimeout(() => handle.abort(), TURN_TIMEOUT_MS);

      send({ type: 'session:status', conversationId: convId, payload: { state: 'RUNNING' }, timestamp: Date.now() });

      (async () => {
        let hadPermissionRequired = false;
        try {
          for await (const ev of handle.events) {
            if (ev.type === 'permission_required') {
              hadPermissionRequired = true;
              conversationHub.setStatus(convId, 'WAITING_INPUT');
              send({
                type: 'chat:interactive_prompt',
                conversationId: convId,
                payload: { tool: ev.tool, command: ev.command, message: ev.message },
                timestamp: Date.now()
              });
            }
            conversationHub.publish(convId, ev);
          }
          send({ type: 'chat:done', conversationId: convId, payload: {}, timestamp: Date.now() });
        } catch (e: any) {
          send({
            type: 'chat:error',
            conversationId: convId,
            payload: {
              message: e.message,
              code: 'TURN_ERROR',
              requestId: (ws as any).requestId,
            },
            timestamp: Date.now()
          });
        } finally {
          clearTimeout(timeout);
          activeTurns.delete(convId);
          const finalState: SessionState = hadPermissionRequired ? 'WAITING_INPUT' : 'IDLE';
          conversationHub.setStatus(convId, finalState);
          send({ type: 'session:status', conversationId: convId, payload: { state: finalState }, timestamp: Date.now() });

          // Extract summary from brain transcript and persist to SQLite summaries DB
          try {
            const summary = extractSessionSummary(convId, workspace);
            if (summary) {
              upsertConversationSummary(summary);
              _index.applyDelta([summary]);
            }
          } catch (e) {
            console.error(`Failed to persist summary for session ${convId}:`, e);
          }
        }
      })();
    }

    if (safeMsg.type === 'chat:set_status' && safeMsg.conversationId && safeMsg.payload?.status) {
      conversationHub.setStatus(safeMsg.conversationId, safeMsg.payload.status);
    }

    if (safeMsg.type === 'chat:cancel' && safeMsg.conversationId) {
      const turn = activeTurns.get(safeMsg.conversationId);
      if (turn) {
        turn.abort();
        activeTurns.delete(safeMsg.conversationId);
        conversationHub.setStatus(safeMsg.conversationId, 'IDLE');
        send({ type: 'session:status', conversationId: safeMsg.conversationId, payload: { state: 'IDLE' }, timestamp: Date.now() });
      }
    }

    if (safeMsg.type === 'chat:quota') {
      runner.quota().then((output) => {
        send({ type: 'quota:result', conversationId: 'system', payload: { output }, timestamp: Date.now() });
      });
    }
  });

  ws.on('close', () => {
    unsubGlobalStatus();
    for (const u of subscriptions.values()) u();
    subscriptions.clear();
  });
}
