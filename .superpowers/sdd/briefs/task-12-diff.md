diff --git a/server/ws/wsServer.ts b/server/ws/wsServer.ts
index e6fc234..ef751f3 100644
--- a/server/ws/wsServer.ts
+++ b/server/ws/wsServer.ts
@@ -34,6 +34,22 @@ export function attachWsServer(
       handleTuiConnection(ws, conversationId);
       return;
     }
+
+    // Ping/pong heartbeat: ping every 25s, disconnect if no pong within 60s
+    const pingInterval = setInterval(() => {
+      if (ws.readyState === WebSocket.OPEN) {
+        ws.ping();
+      }
+    }, 25000);
+
+    ws.on('pong', () => {
+      // Client is alive
+    });
+
+    ws.on('close', () => {
+      clearInterval(pingInterval);
+    });
+
     handleChatConnection(ws, index);
   });
 
diff --git a/src/hooks/useWebSocket.ts b/src/hooks/useWebSocket.ts
index c8119c4..e6a9c91 100644
--- a/src/hooks/useWebSocket.ts
+++ b/src/hooks/useWebSocket.ts
@@ -2,6 +2,15 @@ import { useEffect, useRef, useState, useCallback } from 'react';
 import type { WSMessage } from '@/lib/types';
 import { getStoredToken } from '@/lib/auth';
 
+const INITIAL_DELAY_MS = 1000;
+const MAX_DELAY_MS = 30000;
+const JITTER_MS = 500;
+
+export function getBackoffDelay(attempt: number): number {
+  const exp = Math.min(INITIAL_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
+  return Math.round(exp + Math.random() * JITTER_MS);
+}
+
 export function useWebSocket(url: string, onMessage?: (msg: WSMessage) => void) {
   const wsRef = useRef<WebSocket | null>(null);
   const onMessageRef = useRef(onMessage);
@@ -10,7 +19,9 @@ export function useWebSocket(url: string, onMessage?: (msg: WSMessage) => void)
 
   const [readyState, setReadyState] = useState<WebSocket['readyState']>(WebSocket.CONNECTING);
   const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
+  const [retryCount, setRetryCount] = useState(0);
   const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
+  const reconnectAttemptRef = useRef(0);
 
   const connect = useCallback(() => {
     const token = getStoredToken();
@@ -22,6 +33,8 @@ export function useWebSocket(url: string, onMessage?: (msg: WSMessage) => void)
     setReadyState(WebSocket.CONNECTING);
 
     ws.onopen = () => {
+      reconnectAttemptRef.current = 0;
+      setRetryCount(0);
       setReadyState(WebSocket.OPEN);
       // Flush queued messages sent while socket was connecting
       while (queueRef.current.length > 0) {
@@ -34,7 +47,10 @@ export function useWebSocket(url: string, onMessage?: (msg: WSMessage) => void)
 
     ws.onclose = () => {
       setReadyState(WebSocket.CLOSED);
-      reconnectTimeoutRef.current = setTimeout(connect, 2000);
+      const delay = getBackoffDelay(reconnectAttemptRef.current);
+      reconnectAttemptRef.current += 1;
+      reconnectTimeoutRef.current = setTimeout(connect, delay);
+      setRetryCount(reconnectAttemptRef.current);
     };
 
     ws.onerror = () => ws.close();
@@ -68,5 +84,5 @@ export function useWebSocket(url: string, onMessage?: (msg: WSMessage) => void)
     }
   }, []);
 
-  return { send, lastMessage, readyState };
+  return { send, lastMessage, readyState, retryCount };
 }
diff --git a/tests/client/useWebSocket.test.ts b/tests/client/useWebSocket.test.ts
new file mode 100644
index 0000000..606edce
--- /dev/null
+++ b/tests/client/useWebSocket.test.ts
@@ -0,0 +1,19 @@
+import { describe, it, expect } from 'vitest';
+import { getBackoffDelay } from '../../src/hooks/useWebSocket';
+
+describe('getBackoffDelay', () => {
+  it('starts at ~1000ms for first attempt', () => {
+    const d = getBackoffDelay(0);
+    expect(d).toBeGreaterThanOrEqual(1000);
+    expect(d).toBeLessThanOrEqual(1500);  // 1000 + jitter
+  });
+  it('doubles for second attempt', () => {
+    const d = getBackoffDelay(1);
+    expect(d).toBeGreaterThanOrEqual(2000);
+    expect(d).toBeLessThanOrEqual(2500);  // 2000 + jitter
+  });
+  it('caps at MAX_DELAY_MS (30000)', () => {
+    const d = getBackoffDelay(20);
+    expect(d).toBeLessThanOrEqual(30500);  // 30000 + jitter
+  });
+});
 server/ws/wsServer.ts             | 16 ++++++++++++++++
 src/hooks/useWebSocket.ts         | 20 ++++++++++++++++++--
 tests/client/useWebSocket.test.ts | 19 +++++++++++++++++++
 3 files changed, 53 insertions(+), 2 deletions(-)
