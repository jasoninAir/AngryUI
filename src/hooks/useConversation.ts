import { useEffect, useReducer, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import type { AgyEventClient } from '@/lib/types';

type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; toolCalls?: any[]; thought?: string }
  | { id: string; role: 'tool'; name: string; input: any; output: string };

type State = {
  messages: Message[];
  status: 'IDLE' | 'RUNNING' | 'PAUSED';
  /**
   * True when server emits `chat:interactive_prompt` (e.g. AGY waiting for
   * ask_permission / ask_question). ChatContainer uses this to auto-open
   * the WebTTY modal for interactive resolution.
   */
  interactivePrompt: boolean;
};

type Action =
  | { type: 'user'; text: string }
  | { type: 'event'; event: AgyEventClient }
  | { type: 'status'; status: 'IDLE' | 'RUNNING' | 'PAUSED' }
  | { type: 'interactive_prompt'; active: boolean }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'user':
      return {
        ...state,
        messages: [...state.messages, { id: crypto.randomUUID(), role: 'user', text: action.text }]
      };
    case 'event': {
      const ev = action.event;
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

  useEffect(() => {
    conversationIdRef.current = conversationId;
    // Unsubscribe previous, subscribe new
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
      dispatch({ type: 'status', status: lastMessage.payload.state });
    } else if (lastMessage.type === 'chat:stream') {
      dispatch({ type: 'event', event: lastMessage.payload });
    } else if (lastMessage.type === 'chat:interactive_prompt') {
      dispatch({ type: 'interactive_prompt', active: true });
    }
  }, [lastMessage]);

  const sendPrompt = (text: string, model: string) => {
    dispatch({ type: 'user', text });
    dispatch({ type: 'interactive_prompt', active: false });
    send({
      type: 'chat:send',
      conversationId: conversationIdRef.current,
      payload: { message: text, model },
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

  return { ...state, readyState, send: sendPrompt, cancel, clearInteractivePrompt };
}
