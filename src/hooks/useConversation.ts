import { useEffect, useReducer, useRef, useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { fetchConversationHistory } from '@/lib/api';
import { soundManager } from '@/lib/sound';
import type { AgyEventClient } from '@/lib/types';

export type Message =
  | { id: string; role: 'user'; text: string; timestamp?: string }
  | { id: string; role: 'assistant'; text: string; toolCalls?: any[]; thought?: string; timestamp?: string }
  | { id: string; role: 'tool'; name: string; input: any; output: string; timestamp?: string };

type State = {
  messages: Message[];
  status: 'IDLE' | 'RUNNING' | 'PAUSED';
  interactivePrompt: boolean;
};

type Action =
  | { type: 'user'; text: string }
  | { type: 'event'; event: AgyEventClient }
  | { type: 'status'; status: 'IDLE' | 'RUNNING' | 'PAUSED' }
  | { type: 'interactive_prompt'; active: boolean }
  | { type: 'prepend_history'; messages: Message[] }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
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
    case 'reset':
      return { messages: [], status: 'IDLE', interactivePrompt: false };
  }
}

function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

export function useConversation(conversationId: string) {
  const { send, lastMessage, readyState } = useWebSocket(wsUrl());
  const [state, dispatch] = useReducer(reducer, {
    messages: [],
    status: 'IDLE',
    interactivePrompt: false
  });
  const conversationIdRef = useRef(conversationId);
  const prevStatusRef = useRef<'IDLE' | 'RUNNING' | 'PAUSED'>('IDLE');

  const [loadedTurns, setLoadedTurns] = useState(0);
  const [totalTurns, setTotalTurns] = useState<number | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    conversationIdRef.current = conversationId;
    setLoadedTurns(0);
    setTotalTurns(null);
    setHasMoreHistory(true);
    setHistoryLoading(false);
    prevStatusRef.current = 'IDLE';

    send({
      type: 'chat:unsubscribe',
      conversationId: conversationIdRef.current,
      payload: {},
      timestamp: Date.now()
    });
    dispatch({ type: 'reset' });
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
      dispatch({ type: 'event', event: lastMessage.payload });
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
    workspace?: string
  ) => {
    dispatch({ type: 'user', text });
    dispatch({ type: 'interactive_prompt', active: false });
    send({
      type: 'chat:send',
      conversationId: conversationIdRef.current,
      payload: { message: text, model, effort, workspace },
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
    refresh,
    loadHistory,
    loadedTurns,
    totalTurns,
    hasMoreHistory,
    historyLoading
  };
}
