import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export type SessionState = 'IDLE' | 'RUNNING' | 'WAITING_INPUT';

interface SessionStatusContextType {
  statuses: Record<string, SessionState>;
  getStatus: (conversationId: string) => SessionState;
  setLocalStatus: (conversationId: string, status: SessionState) => void;
}

const SessionStatusContext = createContext<SessionStatusContextType | undefined>(undefined);

function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

export function SessionStatusProvider({ children }: { children: React.ReactNode }) {
  const [statuses, setStatuses] = useState<Record<string, SessionState>>({});
  const { lastMessage, send } = useWebSocket(wsUrl());

  // Fetch initial active statuses from REST API
  useEffect(() => {
    fetch('/api/sessions/status')
      .then((res) => (res.ok ? res.json() : { statuses: {} }))
      .then((data) => {
        if (data && data.statuses) {
          setStatuses((prev) => ({ ...prev, ...data.statuses }));
        }
      })
      .catch(() => {});
  }, []);

  // Listen to live WebSocket status updates
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'session:all_statuses' && lastMessage.payload?.statuses) {
      setStatuses((prev) => ({ ...prev, ...lastMessage.payload.statuses }));
    } else if (lastMessage.type === 'session:status_update' && lastMessage.conversationId) {
      const convId = lastMessage.conversationId;
      const st = lastMessage.payload?.status as SessionState;
      setStatuses((prev) => {
        if (st === 'IDLE') {
          const next = { ...prev };
          delete next[convId];
          return next;
        }
        return { ...prev, [convId]: st };
      });
    } else if (lastMessage.type === 'session:status' && lastMessage.conversationId) {
      const convId = lastMessage.conversationId;
      const st = lastMessage.payload?.state as SessionState;
      setStatuses((prev) => {
        if (st === 'IDLE') {
          const next = { ...prev };
          delete next[convId];
          return next;
        }
        return { ...prev, [convId]: st };
      });
    } else if (lastMessage.type === 'chat:interactive_prompt' && lastMessage.conversationId) {
      const convId = lastMessage.conversationId;
      setStatuses((prev) => ({ ...prev, [convId]: 'WAITING_INPUT' }));
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
          const next = { ...prev };
          delete next[conversationId];
          return next;
        }
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

  return (
    <SessionStatusContext.Provider
      value={{
        statuses,
        getStatus,
        setLocalStatus
      }}
    >
      {children}
    </SessionStatusContext.Provider>
  );
}

export function useSessionStatus() {
  const ctx = useContext(SessionStatusContext);
  if (!ctx) {
    throw new Error('useSessionStatus must be used within a SessionStatusProvider');
  }
  return ctx;
}
