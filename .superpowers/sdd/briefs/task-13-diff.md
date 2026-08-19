diff --git a/server/index.ts b/server/index.ts
index f403256..546bda1 100644
--- a/server/index.ts
+++ b/server/index.ts
@@ -2,6 +2,7 @@ import express from 'express';
 import http from 'http';
 import cors from 'cors';
 import rateLimit from 'express-rate-limit';
+import pinoHttp from 'pino-http';
 import { getConfig } from './config';
 import { attachWsServer } from './ws/wsServer';
 import { requireAuth } from './utils/tokens';
@@ -12,10 +13,21 @@ import { createUploadRouter } from './routes/upload';
 import path from 'path';
 import fs from 'fs';
 import { DiscoveryService } from './services/discoveryService';
+import { PtyManager } from './services/ptyManager';
+import { logger, generateRequestId } from './utils/logger';
 
 const config = getConfig();
 const app = express();
 
+// Request ID middleware
+app.use((req, _res, next) => {
+  (req as any).requestId = (req.headers['x-request-id'] as string) || generateRequestId();
+  next();
+});
+
+// HTTP request/response logging
+app.use(pinoHttp({ logger }));
+
 // CORS — restrict to explicit whitelist (default: same-origin only)
 const corsOptions: cors.CorsOptions = config.corsOrigins.length > 0
   ? {
@@ -79,28 +91,31 @@ attachWsServer(httpServer, config.token, index);
 
 httpServer.on('error', (err: NodeJS.ErrnoException) => {
   if (err.code === 'EADDRINUSE') {
+    logger.error({ port: config.port }, 'Port already in use');
     console.error(`\n❌ Error: Port ${config.port} is already in use by another process.`);
     console.error(`💡 Tip: You can specify a different port using:`);
     console.error(`   npm start -- --port <available-port>`);
     console.error(`   or: AGY_WEBUI_PORT=<available-port> npm start\n`);
     process.exit(1);
   } else {
+    logger.error({ err }, 'Server error');
     console.error('Server error:', err);
     process.exit(1);
   }
 });
 
 httpServer.listen(config.port, config.host, () => {
-  console.log(`AngryUI server listening on http://${config.host}:${config.port}`);
+  logger.info({ host: config.host, port: config.port }, 'AngryUI server listening');
 });
 
 // Graceful shutdown
-const shutdown = (signal: string) => {
-  console.log(`Received ${signal}, shutting down server...`);
+const shutdown = async (signal: string) => {
+  logger.info({ signal }, 'Shutting down server');
   discovery.stop();
+  PtyManager.killAll();  // Kill all pty sessions first
   httpServer.close(() => process.exit(0));
-  // Force exit after 5s if connections refuse to close
-  setTimeout(() => process.exit(1), 5000).unref();
+  // Force exit after 10s if connections refuse to close
+  setTimeout(() => process.exit(1), 10000).unref();
 };
 process.on('SIGINT', () => shutdown('SIGINT'));
 process.on('SIGTERM', () => shutdown('SIGTERM'));
diff --git a/server/services/ptyManager.ts b/server/services/ptyManager.ts
index e9a7dbe..12fb33f 100644
--- a/server/services/ptyManager.ts
+++ b/server/services/ptyManager.ts
@@ -42,6 +42,23 @@ function ensureSpawnHelperExecutable(): void {
 }
 
 export class PtyManager {
+  private static activeSessions = new Map<string, PtySession>();
+
+  static register(id: string, session: PtySession): void {
+    this.activeSessions.set(id, session);
+  }
+
+  static unregister(id: string): void {
+    this.activeSessions.delete(id);
+  }
+
+  static killAll(): void {
+    for (const [, s] of this.activeSessions) {
+      try { s.kill(); } catch { /* ignore */ }
+    }
+    this.activeSessions.clear();
+  }
+
   spawn(conversationId: string, cwd?: string): PtySession {
     ensureSpawnHelperExecutable();
 
@@ -88,7 +105,7 @@ export class PtyManager {
       for (const cb of exitCallbacks) cb();
     });
 
-    return {
+    const session: PtySession = {
       pid: proc.pid,
       onData(cb) {
         dataCallbacks.push(cb);
@@ -106,5 +123,15 @@ export class PtyManager {
         proc.kill();
       }
     };
+
+    // Register this session for tracking
+    PtyManager.register(conversationId, session);
+
+    // Unregister when process exits
+    proc.onExit(() => {
+      PtyManager.unregister(conversationId);
+    });
+
+    return session;
   }
 }
