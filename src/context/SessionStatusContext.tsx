import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { soundManager } from '@/lib/sound';
import { authFetch } from '@/lib/api';

export type SessionState = 'IDLE' | 'RUNNING' | 'WAITING_INPUT' | 'PAUSED';

interface SessionStatusContextType {
  statuses: Record<string, SessionState>;
  getStatus: (conversationId: string) => SessionState;
  setLocalStatus: (conversationId: string, status: SessionState) => void;
  wsReadyState: number;
  wsRetryCount: number;
}

const SessionStatusContext = createContext<SessionStatusContextType | undefined>(undefined);

function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

export function SessionStatusProvider({ children }: { children: React.ReactNode }) {
  const [statuses, setStatuses] = useState<Record<string, SessionState>>({});
  const prevStatusesRef = useRef<Record<string, SessionState>>({});
  const { lastMessage, send, readyState, retryCount } = useWebSocket(wsUrl());

  // Fetch initial active statuses from REST API
  useEffect(() => {
    authFetch('/api/sessions/status')
      .then((res) => (res.ok ? res.json() : { statuses: {} }))
      .then((data) => {
        if (data && data.statuses) {
          setStatuses((prev) => ({ ...prev, ...data.statuses }));
          prevStatusesRef.current = { ...prevStatusesRef.current, ...data.statuses };
        }
      })
      .catch(() => {});
  }, []);

  // Listen to live WebSocket status updates
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'session:all_statuses' && lastMessage.payload?.statuses) {
      setStatuses((prev) => ({ ...prev, ...lastMessage.payload.statuses }));
      prevStatusesRef.current = { ...prevStatusesRef.current, ...lastMessage.payload.statuses };
    } else if (lastMessage.type === 'session:status_update' && lastMessage.conversationId) {
      const convId = lastMessage.conversationId;
      const st = lastMessage.payload?.status as SessionState;
      const prevSt = prevStatusesRef.current[convId];

      if (st === 'WAITING_INPUT' && prevSt !== 'WAITING_INPUT') {
        soundManager.playAttentionRequired();
      } else if (st === 'IDLE' && prevSt === 'RUNNING') {
        soundManager.playTaskComplete();
      }
      prevStatusesRef.current[convId] = st;

      setStatuses((prev) => {
        if (st === 'IDLE') {
          if (!prev[convId]) return prev;
          const next = { ...prev };
          delete next[convId];
          return next;
        }
        if (prev[convId] === st) return prev;
        return { ...prev, [convId]: st };
      });
    } else if (lastMessage.type === 'session:status' && lastMessage.conversationId) {
      const convId = lastMessage.conversationId;
      const st = lastMessage.payload?.state as SessionState;
      const prevSt = prevStatusesRef.current[convId];

      if (st === 'WAITING_INPUT' && prevSt !== 'WAITING_INPUT') {
        soundManager.playAttentionRequired();
      } else if (st === 'IDLE' && prevSt === 'RUNNING') {
        soundManager.playTaskComplete();
      }
      prevStatusesRef.current[convId] = st;

      setStatuses((prev) => {
        if (st === 'IDLE') {
          if (!prev[convId]) return prev;
          const next = { ...prev };
          delete next[convId];
          return next;
        }
        if (prev[convId] === st) return prev;
        return { ...prev, [convId]: st };
      });
    } else if (lastMessage.type === 'chat:interactive_prompt' && lastMessage.conversationId) {
      const convId = lastMessage.conversationId;
      soundManager.playAttentionRequired();
      setStatuses((prev) => {
        if (prev[convId] === 'WAITING_INPUT') return prev;
        return { ...prev, [convId]: 'WAITING_INPUT' };
      });
      prevStatusesRef.current[convId] = 'WAITING_INPUT';
    } else if (lastMessage.type === 'session:upsert' || lastMessage.type === 'session:remove') {
      window.dispatchEvent(new CustomEvent('angryui:session_discovery', { detail: lastMessage }));
    }
  }, [lastMessage]);

  const getStatus = useCallback(
    (conversationId: string): SessionState => {
      return statuses[conversationId] || 'IDLE';
    },
    [statuses]
  );

  const setLocalStatus = useCallback(
    (conversationId: string, status: SessionState) => {
      setStatuses((prev) => {
        if (status === 'IDLE') {
          if (!prev[conversationId]) return prev;
          const next = { ...prev };
          delete next[conversationId];
          return next;
        }
        if (prev[conversationId] === status) return prev;
        return { ...prev, [conversationId]: status };
      });
      // Also notify backend if needed
      send({
        type: 'chat:set_status',
        conversationId,
        payload: { status },
        timestamp: Date.now()
      });
    },
    [send]
  );

  const value = useMemo(
    () => ({
      statuses,
      getStatus,
      setLocalStatus,
      wsReadyState: readyState,
      wsRetryCount: retryCount
    }),
    [statuses, getStatus, setLocalStatus, readyState, retryCount]
  );

  return <SessionStatusContext.Provider value={value}>{children}</SessionStatusContext.Provider>;
}

export function useSessionStatus() {
  const ctx = useContext(SessionStatusContext);
  if (!ctx) {
    throw new Error('useSessionStatus must be used within a SessionStatusProvider');
  }
  return ctx;
}
