import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage } from '@/lib/types';
import { getStoredToken } from '@/lib/auth';
import { useBatterySaver } from './useBatterySaver';

const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const JITTER_MS = 500;
const PING_INTERVAL_MS = 25000;
const RTT_WINDOW_SIZE = 10;

export type ConnectionQualityState = 'good' | 'degraded' | 'reconnecting' | 'offline';

export function getBackoffDelay(attempt: number): number {
  const exp = Math.min(INITIAL_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
  return Math.round(exp + Math.random() * JITTER_MS);
}

export function useWebSocket(
  url: string,
  onMessage?: (msg: WSMessage) => void,
  onOpen?: (isReconnect: boolean) => void
) {
  const isVisible = useBatterySaver();
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const queueRef = useRef<WSMessage[]>([]);
  const hasConnectedOnceRef = useRef(false);

  const [readyState, setReadyState] = useState<WebSocket['readyState']>(WebSocket.CONNECTING);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [rtt, setRtt] = useState<number>(0);
  const rttSamplesRef = useRef<number[]>([]);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(() => {
    const token = getStoredToken();
    // Use WebSocket Subprotocol for bearer token to prevent token leaking in URL logs
    const protocols = token ? ['bearer', token] : undefined;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url, protocols);
    } catch {
      // Fallback if browser/environment rejects subprotocols
      const wsUrl = token
        ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
        : url;
      ws = new WebSocket(wsUrl);
    }

    wsRef.current = ws;
    setReadyState(WebSocket.CONNECTING);

    // Setup client ping timer
    if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    pingTimerRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'chat:ping', timestamp: Date.now() }));
        } catch {}
      }
    }, PING_INTERVAL_MS);

    ws.onopen = () => {
      const isReconnect = hasConnectedOnceRef.current;
      hasConnectedOnceRef.current = true;
      reconnectAttemptRef.current = 0;
      setRetryCount(0);
      setReadyState(WebSocket.OPEN);

      // Immediately send a ping on open to establish initial RTT
      try {
        ws.send(JSON.stringify({ type: 'chat:ping', timestamp: Date.now() }));
      } catch {}

      // Flush queued messages sent while socket was connecting
      while (queueRef.current.length > 0) {
        const nextMsg = queueRef.current.shift();
        if (nextMsg && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(nextMsg));
        }
      }
      onOpenRef.current?.(isReconnect);
    };

    ws.onclose = () => {
      setReadyState(WebSocket.CLOSED);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);

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
        // Handle chat:pong for RTT latency calculation
        if (msg.type === 'chat:pong') {
          const sentTs = msg.payload?.clientTs || msg.timestamp || Date.now();
          const sampleRtt = Math.max(1, Date.now() - sentTs);
          const samples = rttSamplesRef.current;
          samples.push(sampleRtt);
          if (samples.length > RTT_WINDOW_SIZE) samples.shift();
          const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
          setRtt(avg);
          return;
        }

        // Call immediate listener first to avoid React state batching drops
        onMessageRef.current?.(msg);
        setLastMessage(msg);
      } catch {
        // ignore non-JSON
      }
    };
  }, [url, isVisible]);

  useEffect(() => {
    connect();

    // Listen to network change events for instant reconnection
    const handleOnline = () => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        reconnectAttemptRef.current = 0;
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        connect();
      }
    };

    const handleOffline = () => {
      setReadyState(WebSocket.CLOSED);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      queueRef.current.push(msg);
    }
  }, []);

  // Compute overall connection quality state
  let quality: ConnectionQualityState = 'offline';
  if (readyState === WebSocket.OPEN) {
    quality = rtt > 400 ? 'degraded' : 'good';
  } else if (readyState === WebSocket.CONNECTING || retryCount > 0) {
    quality = 'reconnecting';
  }

  return {
    send,
    lastMessage,
    readyState,
    retryCount,
    rtt,
    quality,
    connect
  };
}
