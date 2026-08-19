import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage } from '@/lib/types';
import { getStoredToken } from '@/lib/auth';
import { useBatterySaver } from './useBatterySaver';

const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const JITTER_MS = 500;

export function getBackoffDelay(attempt: number): number {
  const exp = Math.min(INITIAL_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
  return Math.round(exp + Math.random() * JITTER_MS);
}

export function useWebSocket(url: string, onMessage?: (msg: WSMessage) => void) {
  const isVisible = useBatterySaver();
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const queueRef = useRef<WSMessage[]>([]);

  const [readyState, setReadyState] = useState<WebSocket['readyState']>(WebSocket.CONNECTING);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);

  const connect = useCallback(() => {
    const token = getStoredToken();
    const wsUrl = token
      ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
      : url;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setReadyState(WebSocket.CONNECTING);

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setRetryCount(0);
      setReadyState(WebSocket.OPEN);
      // Flush queued messages sent while socket was connecting
      while (queueRef.current.length > 0) {
        const nextMsg = queueRef.current.shift();
        if (nextMsg && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(nextMsg));
        }
      }
    };

    ws.onclose = () => {
      setReadyState(WebSocket.CLOSED);
      if (!isVisible) {
        const handleVisible = () => {
          document.removeEventListener('visibilitychange', handleVisible);
          reconnectAttemptRef.current = 0;
          connect();
        };
        document.addEventListener('visibilitychange', handleVisible);
        return;
      }
      const delay = getBackoffDelay(reconnectAttemptRef.current);
      reconnectAttemptRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
      setRetryCount(reconnectAttemptRef.current);
    };

    ws.onerror = () => ws.close();

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        // Call immediate listener first to avoid React state batching drops
        onMessageRef.current?.(msg);
        setLastMessage(msg);
      } catch {
        // ignore non-JSON
      }
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      // Buffer message until WebSocket connection is open
      queueRef.current.push(msg);
    }
  }, []);

  return { send, lastMessage, readyState, retryCount };
}
