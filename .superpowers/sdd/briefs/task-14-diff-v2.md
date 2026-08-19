diff --git a/server/index.ts b/server/index.ts
index 546bda1..1169ea8 100644
--- a/server/index.ts
+++ b/server/index.ts
@@ -83,7 +83,7 @@ if (fs.existsSync(distPath)) {
 // Logs deltas; in later phases, this will broadcast over WebSocket.
 const discovery = new DiscoveryService(index);
 discovery.start((event) => {
-  console.log(`[Discovery] ${event.type}: ${event.conversation_id}`);
+  logger.info({ type: event.type, conversation_id: event.conversation_id }, '[Discovery]');
 });
 
 const httpServer = http.createServer(app);
diff --git a/server/ws/wsServer.ts b/server/ws/wsServer.ts
index ef751f3..9379c2c 100644
--- a/server/ws/wsServer.ts
+++ b/server/ws/wsServer.ts
@@ -28,6 +28,9 @@ export function attachWsServer(
   });
 
   wss.on('connection', (ws: WebSocket, req: any) => {
+    // Propagate requestId to WS for logging (set by requestId middleware on HTTP request)
+    (ws as any).requestId = (req as any).requestId;
+
     const url = new URL(req.url ?? '/', 'http://localhost');
     if (url.pathname.startsWith('/ws/tui/')) {
       const conversationId = url.pathname.replace('/ws/tui/', '');
 server/index.ts       | 2 +-
 server/ws/wsServer.ts | 3 +++
 2 files changed, 4 insertions(+), 1 deletion(-)
