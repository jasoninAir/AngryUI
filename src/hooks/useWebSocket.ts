import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage } from '@/lib/types';

export function useWebSocket(url: string, onMessage?: (msg: WSMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const queueRef = useRef<WSMessage[]>([]);

  const [readyState, setReadyState] = useState<WebSocket['readyState']>(WebSocket.CONNECTING);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setReadyState(WebSocket.CONNECTING);

    ws.onopen = () => {
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
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
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

  return { send, lastMessage, readyState };
}
