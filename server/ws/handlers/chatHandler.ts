import fs from 'fs';
import path from 'path';
import { WebSocket } from 'ws';
import { TurnRunner } from '../../services/turnRunner';
import { ConversationIndex } from '../../db/conversationIndex';
import { AgyEvent } from '../../utils/streamParser';
import { conversationHub, SessionState } from '../conversationHub';
import { activeTurnManager } from '../../services/activeTurnManager';
import { extractSessionSummary, upsertConversationSummary } from '../../services/sessionSummaryService';
import { normalizeWorkspacePath, toFileUri } from '../../utils/workspacePath';
import { getConfig } from '../../config';
import { ConversationSummary } from '../../db/sqliteClient';
import { ClientMsgSchema, ServerMsgSchema } from '../protocol';
import { logger } from '../../utils/logger';
import { getRequestContext, runWithRequestContext, generateRequestId } from '../../utils/requestContext';

interface ClientMsg {
  type: string;
  conversationId?: string;
  payload?: any;
  lastSeq?: number;
  pauseWhenHidden?: boolean;
}

interface ServerMsg {
  type: string;
  conversationId: string;
  payload: any;
  seq?: number;
  timestamp: number;
}

const TURN_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of silence without any stream output
const TURN_MAX_LIFETIME_MS = 120 * 60 * 1000; // 2 hours max per turn
const MAX_BUFFERED_AMOUNT = 1024 * 1024; // 1MB backpressure threshold

export function handleChatConnection(ws: WebSocket, _index: ConversationIndex): void {
  const runner = new TurnRunner();
  const subscriptions = new Map<string, () => void>();
  const outQueue: string[] = [];
  let isDraining = false;

  const flushQueue = () => {
    while (outQueue.length > 0 && ws.readyState === ws.OPEN) {
      if (ws.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        break;
      }
      const item = outQueue.shift();
      if (item) ws.send(item);
    }
    if (outQueue.length > 0 && !isDraining) {
      isDraining = true;
      setTimeout(() => {
        isDraining = false;
        flushQueue();
      }, 50);
    }
  };

  const send = (msg: ServerMsg) => {
    if (ws.readyState !== ws.OPEN) return;

    // Validate outbound message against schema
    const validation = ServerMsgSchema.safeParse(msg);
    let messageToSend: any = msg;
    if (!validation.success) {
      logger.warn(
        { error: validation.error.format(), msgType: msg.type, conversationId: msg.conversationId },
        'Outbound WebSocket message failed schema validation'
      );
    }

    // Attach current requestId if sending an error message and requestId not provided
    const reqCtx = getRequestContext();
    if (reqCtx?.requestId && messageToSend.type === 'chat:error' && !messageToSend.payload?.requestId) {
      messageToSend = {
        ...messageToSend,
        payload: { ...messageToSend.payload, requestId: reqCtx.requestId }
      };
    }

    const str = JSON.stringify(messageToSend);
    if (ws.bufferedAmount > MAX_BUFFERED_AMOUNT || outQueue.length > 0) {
      if (outQueue.length > 2000) {
        // Discard oldest non-critical message if client is severely stalled
        outQueue.shift();
      }
      outQueue.push(str);
      flushQueue();
    } else {
      ws.send(str);
    }
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

  const subscribeConversation = (convId: string, lastSeq?: number, pauseWhenHidden?: boolean) => {
    const existingUnsub = subscriptions.get(convId);
    if (existingUnsub) {
      existingUnsub();
      subscriptions.delete(convId);
    }

    const subHandle = conversationHub.subscribe(
      convId,
      (event: AgyEvent, seq: number) => {
        // If pauseWhenHidden is active and socket buffer is filling up, skip low-priority text deltas
        if (
          pauseWhenHidden &&
          ws.bufferedAmount > MAX_BUFFERED_AMOUNT / 2 &&
          event.type === 'step_update' &&
          (event as any).step_type === 'agent_response'
        ) {
          return;
        }
        send({
          type: 'chat:stream',
          conversationId: convId,
          payload: event,
          seq,
          timestamp: Date.now()
        });
      },
      lastSeq
    );

    if (subHandle.isTruncated) {
      send({
        type: 'chat:buffer_truncated',
        conversationId: convId,
        payload: {
          droppedSeq: subHandle.minSeq,
          lastSeq: lastSeq ?? 0,
        },
        timestamp: Date.now()
      });
    }

    subscriptions.set(convId, subHandle.unsubscribe);
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
      send({
        type: 'chat:error',
        conversationId: 'system',
        payload: { message: 'Invalid message format', code: 'INVALID_MSG' },
        timestamp: Date.now()
      });
      return;
    }
    const safeMsg = parsed.data;

    runWithRequestContext({ requestId: (ws as any).requestId || generateRequestId(), conversationId: (safeMsg as any).conversationId }, () => {
      if (safeMsg.type === 'chat:subscribe' && safeMsg.conversationId) {
      const convId = safeMsg.conversationId;
      const lastSeq = (safeMsg as any).lastSeq;
      const pauseWhenHidden = Boolean((safeMsg as any).pauseWhenHidden);

      subscribeConversation(convId, lastSeq, pauseWhenHidden);
      const currentStatus = conversationHub.getStatus(convId);
      send({
        type: 'session:status',
        conversationId: convId,
        payload: { state: currentStatus },
        timestamp: Date.now()
      });
      return;
    }

    if (safeMsg.type === 'chat:reconnect_resume' && safeMsg.conversationId) {
      const convId = safeMsg.conversationId;
      const lastSeq = (safeMsg as any).lastSeq;

      subscribeConversation(convId, lastSeq, false);
      const currentStatus = conversationHub.getStatus(convId);
      send({
        type: 'session:status',
        conversationId: convId,
        payload: { state: currentStatus },
        timestamp: Date.now()
      });
      return;
    }

    if (safeMsg.type === 'chat:ping') {
      const clientTs = (safeMsg as any).timestamp || (safeMsg as any).payload?.ts || Date.now();
      send({
        type: 'chat:pong',
        conversationId: safeMsg.conversationId || 'global',
        payload: { clientTs },
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
      const { message, model, effort, workspace, dangerouslySkipPermissions } = safeMsg.payload;

      // 1. Validate & normalize workspace path (refuse fallback to process.cwd)
      let normalizedCwd: string;
      try {
        normalizedCwd = normalizeWorkspacePath(workspace);
      } catch (err: any) {
        send({
          type: 'chat:error',
          conversationId: convId,
          payload: {
            message: err.message || 'Invalid workspace directory',
            code: 'INVALID_WORKSPACE',
          },
          timestamp: Date.now()
        });
        return;
      }

      // 2. Prevent duplicate/concurrent turns on the same conversation
      if (activeTurnManager.has(convId)) {
        send({
          type: 'chat:error',
          conversationId: convId,
          payload: {
            message: 'A turn is already in progress for this conversation',
            code: 'TURN_ALREADY_RUNNING',
          },
          timestamp: Date.now()
        });
        return;
      }

      // 3. Pre-occupy brain transcript file and bind workspace in SQLite summary
      try {
        const brainDir = path.join(getConfig().agyHome, 'brain', convId);
        const transcriptFile = path.join(brainDir, '.system_generated', 'logs', 'transcript.jsonl');
        if (!fs.existsSync(transcriptFile)) {
          fs.mkdirSync(path.dirname(transcriptFile), { recursive: true });
          fs.writeFileSync(transcriptFile, '');
        }

        const existingSummary = typeof _index.getById === 'function' ? _index.getById(convId) : null;
        if (!existingSummary) {
          const initialSummary: ConversationSummary = {
            conversation_id: convId,
            title: message.slice(0, 100),
            preview: message.slice(0, 200),
            step_count: 0,
            last_modified_time: new Date().toISOString(),
            workspace_uris: [toFileUri(normalizedCwd)],
            status: 'IDLE',
            source: 'CLI',
            project_id: '',
            agent_name: '',
            parent_conversation_id: '',
            nesting_depth: 0,
            not_fully_idle: false,
            killed: false,
            last_user_input_time: new Date().toISOString(),
          };
          upsertConversationSummary(initialSummary);
          _index.applyDelta([initialSummary]);
        }
      } catch (err) {
        console.error(`Failed to pre-bind brain dir for ${convId}:`, err);
      }

      subscribeConversation(convId);

      const handle = runner.spawn({
        conversationId: convId,
        message,
        model,
        effort,
        cwd: normalizedCwd,
        dangerouslySkipPermissions: Boolean(dangerouslySkipPermissions)
      });

      activeTurnManager.register(convId, {
        conversationId: convId,
        handle,
        abort: handle.abort,
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
        cwd: normalizedCwd,
        dangerouslySkipPermissions: Boolean(dangerouslySkipPermissions)
      });

      conversationHub.setStatus(convId, 'RUNNING');

      let activityTimer: NodeJS.Timeout | null = null;
      const resetActivityTimer = () => {
        if (activityTimer) clearTimeout(activityTimer);
        activeTurnManager.updateActivity(convId);
        activityTimer = setTimeout(() => {
          activeTurnManager.abort(convId);
        }, TURN_INACTIVITY_TIMEOUT_MS);
      };

      resetActivityTimer();
      const maxLifetimeTimer = setTimeout(() => {
        activeTurnManager.abort(convId);
      }, TURN_MAX_LIFETIME_MS);

      send({
        type: 'session:status',
        conversationId: convId,
        payload: { state: 'RUNNING' },
        timestamp: Date.now()
      });

      (async () => {
        let isPendingPermission = false;
        try {
          for await (const ev of handle.events) {
            resetActivityTimer();
            if (ev.type === 'permission_required') {
              isPendingPermission = true;
              conversationHub.setStatus(convId, 'WAITING_INPUT');
              send({
                type: 'chat:interactive_prompt',
                conversationId: convId,
                payload: { tool: ev.tool, command: ev.command, message: ev.message },
                timestamp: Date.now()
              });
            } else if (ev.type === 'step_update' || ev.type === 'result') {
              if (ev.type === 'result') {
                isPendingPermission = false;
              }
            }
            conversationHub.publish(convId, ev);
          }
          isPendingPermission = false;
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
          if (activityTimer) clearTimeout(activityTimer);
          clearTimeout(maxLifetimeTimer);
          activeTurnManager.remove(convId);

          const finalState: SessionState = isPendingPermission ? 'WAITING_INPUT' : 'IDLE';
          conversationHub.setStatus(convId, finalState);
          send({
            type: 'session:status',
            conversationId: convId,
            payload: { state: finalState },
            timestamp: Date.now()
          });

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
      const convId = safeMsg.conversationId;
      activeTurnManager.abort(convId);
      conversationHub.setStatus(convId, 'IDLE');
      send({
        type: 'session:status',
        conversationId: convId,
        payload: { state: 'IDLE' },
        timestamp: Date.now()
      });
    }

    if (safeMsg.type === 'chat:quota') {
      runner.quota().then((output) => {
        send({ type: 'quota:result', conversationId: 'system', payload: { output }, timestamp: Date.now() });
      });
    }
    });
  });

  ws.on('close', () => {
    unsubGlobalStatus();
    for (const u of subscriptions.values()) u();
    subscriptions.clear();
    outQueue.length = 0;
  });
}

