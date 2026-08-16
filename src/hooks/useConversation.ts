import { useEffect, useReducer, useRef, useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { fetchConversationHistory } from '@/lib/api';
import { soundManager } from '@/lib/sound';
import type { AgyEventClient } from '@/lib/types';

export type Message =
  | { id: string; role: 'user'; text: string; timestamp?: string }
  | { id: string; role: 'assistant'; text: string; toolCalls?: any[]; thought?: string; timestamp?: string }
  | { id: string; role: 'tool'; name: string; input: any; output: string; timestamp?: string };

export interface PermissionPromptInfo {
  tool: string;
  command?: string;
  message: string;
}

export interface CachedConversationState {
  messages: Message[];
  loadedTurns: number;
  totalTurns: number | null;
  hasMoreHistory: boolean;
  permissionPrompt?: PermissionPromptInfo | null;
}

// Global In-Memory Cache for all active sessions in the browser tab lifetime
const sessionCache = new Map<string, CachedConversationState>();

export function getCachedConversation(id: string): CachedConversationState | undefined {
  return sessionCache.get(id);
}

export function clearSessionCache(id?: string): void {
  if (id) {
    sessionCache.delete(id);
  } else {
    sessionCache.clear();
  }
}

type State = {
  messages: Message[];
  status: 'IDLE' | 'RUNNING' | 'PAUSED';
  interactivePrompt: boolean;
  permissionPrompt?: PermissionPromptInfo | null;
};

type Action =
  | { type: 'user'; text: string }
  | { type: 'event'; event: AgyEventClient }
  | { type: 'status'; status: 'IDLE' | 'RUNNING' | 'PAUSED' }
  | { type: 'interactive_prompt'; active: boolean }
  | { type: 'permission_prompt'; info?: PermissionPromptInfo | null }
  | { type: 'prepend_history'; messages: Message[] }
  | { type: 'restore'; state: CachedConversationState }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'restore':
      return {
        messages: action.state.messages,
        status: 'IDLE',
        interactivePrompt: false,
        permissionPrompt: action.state.permissionPrompt ?? null
      };
    case 'prepend_history': {
      // Filter out messages that already exist by ID to avoid duplicates
      const existingIds = new Set(state.messages.map((m) => m.id));
      const newMessages = action.messages.filter((m) => !existingIds.has(m.id));
      return {
        ...state,
        messages: [...newMessages, ...state.messages]
      };
    }
    case 'user':
      return {
        ...state,
        messages: [...state.messages, { id: crypto.randomUUID(), role: 'user', text: action.text }]
      };
    case 'event': {
      const ev = action.event;
      if (ev.type === 'error') {
        return {
          ...state,
          messages: [
            ...state.messages,
            { id: crypto.randomUUID(), role: 'assistant', text: `❌ 错误: ${ev.message}` }
          ]
        };
      }
      if (ev.type === 'step_update') {
        if (ev.step_type === 'agent_response' && ev.text_delta) {
          const last = state.messages[state.messages.length - 1];
          if (last?.role === 'assistant') {
            const updated = [...state.messages];
            updated[updated.length - 1] = { ...last, text: last.text + ev.text_delta };
            return { ...state, messages: updated };
          } else {
            return {
              ...state,
              messages: [
                ...state.messages,
                { id: crypto.randomUUID(), role: 'assistant', text: ev.text_delta }
              ]
            };
          }
        }
        if (ev.step_type === 'tool' && ev.tool_name) {
          return {
            ...state,
            messages: [
              ...state.messages,
              {
                id: crypto.randomUUID(),
                role: 'tool',
                name: ev.tool_name,
                input: ev.tool_info?.parameters ?? {},
                output: ev.tool_info?.output ?? ''
              }
            ]
          };
        }
      }
      if (ev.type === 'result') {
        const last = state.messages[state.messages.length - 1];
        if (last?.role === 'assistant' && !last.text && ev.response) {
          const updated = [...state.messages];
          updated[updated.length - 1] = { ...last, text: ev.response };
          return { ...state, messages: updated };
        }
      }
      return state;
    }
    case 'status':
      return { ...state, status: action.status };
    case 'interactive_prompt':
      return { ...state, interactivePrompt: action.active };
    case 'permission_prompt':
      return { ...state, permissionPrompt: action.info ?? null };
    case 'reset':
      return { messages: [], status: 'IDLE', interactivePrompt: false, permissionPrompt: null };
  }
}

function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

export function useConversation(conversationId: string) {
  const { send, lastMessage, readyState } = useWebSocket(wsUrl());
  const initialCached = sessionCache.get(conversationId);

  const [state, dispatch] = useReducer(reducer, {
    messages: initialCached?.messages || [],
    status: 'IDLE',
    interactivePrompt: false,
    permissionPrompt: initialCached?.permissionPrompt || null
  });
  const conversationIdRef = useRef(conversationId);
  const prevStatusRef = useRef<'IDLE' | 'RUNNING' | 'PAUSED'>('IDLE');

  const [loadedTurns, setLoadedTurns] = useState<number>(initialCached?.loadedTurns || 0);
  const [totalTurns, setTotalTurns] = useState<number | null>(initialCached?.totalTurns ?? null);
  const [hasMoreHistory, setHasMoreHistory] = useState<boolean>(initialCached?.hasMoreHistory ?? true);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Sync to global sessionCache
  useEffect(() => {
    sessionCache.set(conversationId, {
      messages: state.messages,
      loadedTurns,
      totalTurns,
      hasMoreHistory,
      permissionPrompt: state.permissionPrompt
    });
  }, [conversationId, state.messages, loadedTurns, totalTurns, hasMoreHistory, state.permissionPrompt]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
    const existing = sessionCache.get(conversationId);

    if (existing && existing.messages.length > 0) {
      dispatch({ type: 'restore', state: existing });
      setLoadedTurns(existing.loadedTurns);
      setTotalTurns(existing.totalTurns);
      setHasMoreHistory(existing.hasMoreHistory);
    } else {
      dispatch({ type: 'reset' });
      setLoadedTurns(0);
      setTotalTurns(null);
      setHasMoreHistory(true);

      // Auto load first 5 turns of history on initial open of an existing conversation
      fetchConversationHistory(conversationId, 5, 0)
        .then((res) => {
          if (res && res.messages && res.messages.length > 0 && conversationIdRef.current === conversationId) {
            dispatch({ type: 'prepend_history', messages: res.messages as Message[] });
            setLoadedTurns(res.loadedTurns);
            setTotalTurns(res.totalTurns);
            setHasMoreHistory(res.hasMore);
          }
        })
        .catch(() => {});
    }

    setHistoryLoading(false);
    prevStatusRef.current = 'IDLE';

    send({
      type: 'chat:unsubscribe',
      conversationId: conversationIdRef.current,
      payload: {},
      timestamp: Date.now()
    });
    send({
      type: 'chat:subscribe',
      conversationId,
      payload: {},
      timestamp: Date.now()
    });
  }, [conversationId, send]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.conversationId !== conversationIdRef.current) return;

    if (lastMessage.type === 'session:status') {
      const nextState = lastMessage.payload.state;
      if (prevStatusRef.current === 'RUNNING' && nextState === 'IDLE') {
        soundManager.playTaskComplete();
      }
      prevStatusRef.current = nextState;
      dispatch({ type: 'status', status: nextState });
    } else if (lastMessage.type === 'chat:stream') {
      const ev = lastMessage.payload;
      if (ev?.type === 'permission_required') {
        soundManager.playAttentionRequired();
        dispatch({
          type: 'permission_prompt',
          info: {
            tool: ev.tool || 'command',
            command: ev.command,
            message: ev.message || 'Tool permission required'
          }
        });
      }
      dispatch({ type: 'event', event: ev });
    } else if (lastMessage.type === 'chat:error') {
      dispatch({
        type: 'event',
        event: { type: 'error', message: lastMessage.payload?.message || 'Chat execution error' }
      });
    } else if (lastMessage.type === 'chat:interactive_prompt') {
      soundManager.playAttentionRequired();
      dispatch({ type: 'interactive_prompt', active: true });
    }
  }, [lastMessage]);

  const loadHistory = useCallback(async (limit = 5) => {
    if (historyLoading || !hasMoreHistory) return;
    setHistoryLoading(true);
    try {
      const res = await fetchConversationHistory(conversationIdRef.current, limit, loadedTurns);
      setTotalTurns(res.totalTurns);
      setHasMoreHistory(res.hasMore);
      setLoadedTurns(res.loadedTurns);
      if (res.messages.length > 0) {
        dispatch({ type: 'prepend_history', messages: res.messages as Message[] });
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setHistoryLoading(false);
    }
  }, [hasMoreHistory, historyLoading, loadedTurns]);

  const sendPrompt = (
    text: string,
    model: string,
    effort?: 'low' | 'medium' | 'high',
    workspace?: string,
    dangerouslySkipPermissions?: boolean
  ) => {
    dispatch({ type: 'user', text });
    dispatch({ type: 'interactive_prompt', active: false });
    dispatch({ type: 'permission_prompt', info: null });
    send({
      type: 'chat:send',
      conversationId: conversationIdRef.current,
      payload: { message: text, model, effort, workspace, dangerouslySkipPermissions },
      timestamp: Date.now()
    });
  };

  const cancel = () => {
    send({
      type: 'chat:cancel',
      conversationId: conversationIdRef.current,
      payload: {},
      timestamp: Date.now()
    });
  };

  const clearInteractivePrompt = () => {
    dispatch({ type: 'interactive_prompt', active: false });
  };

  const clearPermissionPrompt = () => {
    dispatch({ type: 'permission_prompt', info: null });
  };

  const refresh = () => {
    send({
      type: 'chat:unsubscribe',
      conversationId: conversationIdRef.current,
      payload: {},
      timestamp: Date.now()
    });
    dispatch({ type: 'reset' });
    send({
      type: 'chat:subscribe',
      conversationId: conversationIdRef.current,
      payload: {},
      timestamp: Date.now()
    });
  };

  return {
    ...state,
    readyState,
    send: sendPrompt,
    cancel,
    clearInteractivePrompt,
    clearPermissionPrompt,
    refresh,
    loadHistory,
    loadedTurns,
    totalTurns,
    hasMoreHistory,
    historyLoading
  };
}
