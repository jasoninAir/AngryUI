diff --git a/server/config.ts b/server/config.ts
index 22d4be1..83ebf6f 100644
--- a/server/config.ts
+++ b/server/config.ts
@@ -9,6 +9,7 @@ export interface Config {
   agyHome: string;
   webuiHome: string;
   agyBin: string;
+  allowSkipPermissions: boolean;
 }
 
 function resolveAgyBin(): string {
@@ -37,9 +38,10 @@ export function parseCliArgs(argv = process.argv.slice(2)): {
   port?: number;
   host?: string;
   token?: string;
+  allowSkipPermissions?: boolean;
   help?: boolean;
 } {
-  const result: { port?: number; host?: string; token?: string; help?: boolean } = {};
+  const result: { port?: number; host?: string; token?: string; allowSkipPermissions?: boolean; help?: boolean } = {};
 
   for (let i = 0; i < argv.length; i++) {
     const arg = argv[i];
@@ -62,6 +64,11 @@ export function parseCliArgs(argv = process.argv.slice(2)): {
       if (val) result.token = val;
     } else if (arg.startsWith('--token=')) {
       result.token = arg.split('=')[1];
+    } else if (arg === '--allow-skip-permissions') {
+      result.allowSkipPermissions = true;
+    } else if (arg.startsWith('--allow-skip-permissions=')) {
+      const val = arg.split('=')[1];
+      result.allowSkipPermissions = val === 'true';
     }
   }
 
@@ -80,10 +87,11 @@ Usage:
   node dist-server/server/index.js [options]
 
 Options:
-  -p, --port <port>       Port to listen on (default: 5173, env: AGY_WEBUI_PORT, PORT)
-      --host <host>       Host to bind (default: 0.0.0.0, env: AGY_WEBUI_HOST)
-  -t, --token <token>     Optional access token for API protection (env: AGY_WEBUI_TOKEN)
-      --help              Show this help message
+  -p, --port <port>           Port to listen on (default: 5173, env: AGY_WEBUI_PORT, PORT)
+      --host <host>           Host to bind (default: 0.0.0.0, env: AGY_WEBUI_HOST)
+  -t, --token <token>         Optional access token for API protection (env: AGY_WEBUI_TOKEN)
+      --allow-skip-permissions  Allow skipping permission prompts (default: false, env: AGY_WEBUI_ALLOW_SKIP_PERMISSIONS)
+      --help                  Show this help message
 
 Examples:
   npm start -- --port 8080
@@ -109,10 +117,16 @@ Examples:
     process.env.AGY_WEBUI_TOKEN ??
     null;
 
+  const allowSkipPermissions =
+    cli.allowSkipPermissions ??
+    process.env.AGY_WEBUI_ALLOW_SKIP_PERMISSIONS === 'true' ??
+    false;
+
   return {
     port,
     host,
     token,
+    allowSkipPermissions,
     agyHome: path.join(os.homedir(), '.gemini', 'antigravity-cli'),
     webuiHome: path.join(os.homedir(), '.agy-webui'),
     agyBin: resolveAgyBin()
diff --git a/server/services/turnRunner.ts b/server/services/turnRunner.ts
index 7312eeb..d5fea49 100644
--- a/server/services/turnRunner.ts
+++ b/server/services/turnRunner.ts
@@ -9,7 +9,6 @@ export interface TurnOptions {
   message: string;
   model?: string;
   effort?: 'low' | 'medium' | 'high';
-  dangerouslySkipPermissions?: boolean;
   cwd?: string;
 }
 
@@ -60,12 +59,12 @@ export class TurnRunner {
     }
 
     const formattedModel = formatAgyModel(opts.model, opts.effort);
-    const skipPerms = Boolean(opts.dangerouslySkipPermissions);
+    const allowSkip = getConfig().allowSkipPermissions;
     const args = [
       '--conversation', opts.conversationId,
       '--add-dir', runCwd,
       ...(formattedModel ? ['--model', formattedModel] : []),
-      ...(skipPerms ? ['--dangerously-skip-permissions'] : []),
+      ...(allowSkip ? ['--dangerously-skip-permissions'] : []),
       '--output-format', 'stream-json',
       '--print', opts.message
     ];
diff --git a/server/ws/handlers/chatHandler.ts b/server/ws/handlers/chatHandler.ts
index 7f6bc56..2cc9047 100644
--- a/server/ws/handlers/chatHandler.ts
+++ b/server/ws/handlers/chatHandler.ts
@@ -90,7 +90,7 @@ export function handleChatConnection(ws: WebSocket, _index: ConversationIndex):
 
     if (msg.type === 'chat:send' && msg.conversationId && msg.payload) {
       const convId = msg.conversationId;
-      const { message, model, effort, dangerouslySkipPermissions, workspace } = msg.payload;
+      const { message, model, effort, workspace } = msg.payload;
 
       subscribeConversation(convId);
 
@@ -99,7 +99,6 @@ export function handleChatConnection(ws: WebSocket, _index: ConversationIndex):
         message,
         model,
         effort,
-        dangerouslySkipPermissions,
         cwd: workspace
       });
 
diff --git a/tests/server/chatHandler.bypass.test.ts b/tests/server/chatHandler.bypass.test.ts
new file mode 100644
index 0000000..960baf9
--- /dev/null
+++ b/tests/server/chatHandler.bypass.test.ts
@@ -0,0 +1,49 @@
+import { describe, it, expect, vi, beforeEach } from 'vitest';
+import { handleChatConnection } from '../../server/ws/handlers/chatHandler';
+
+// We need to mock the TurnRunner module since it's imported at module level
+vi.mock('../../server/services/turnRunner', () => ({
+  TurnRunner: class {
+    spawn(opts: any) {
+      // Store the options globally for test inspection
+      (globalThis as any).__test_capturedOptions = opts;
+      return {
+        abort: vi.fn(), pid: 1,
+        events: { [Symbol.asyncIterator]: () => ({ next: () => Promise.resolve({ done: true }) }) }
+      };
+    }
+    quota() { return Promise.resolve(''); }
+  },
+}));
+
+describe('dangerouslySkipPermissions bypass prevention', () => {
+  beforeEach(() => {
+    (globalThis as any).__test_capturedOptions = null;
+  });
+
+  it('server must not pass dangerouslySkipPermissions from client payload to TurnRunner', async () => {
+    const fakeWs = {
+      send: vi.fn(),
+      readyState: 1, // OPEN
+      on: vi.fn((event: string, handler: any) => {
+        if (event === 'message') {
+          // Immediately trigger the handler with our test message
+          handler(JSON.stringify({
+            type: 'chat:send',
+            conversationId: 'test-conv',
+            payload: { message: 'hello', dangerouslySkipPermissions: true }
+          }));
+        }
+      }),
+      close: vi.fn(),
+    } as any;
+    const fakeIndex = { applyDelta: vi.fn() } as any;
+
+    handleChatConnection(fakeWs, fakeIndex);
+
+    // Server MUST NOT forward dangerouslySkipPermissions to TurnRunner
+    const capturedOptions = (globalThis as any).__test_capturedOptions;
+    expect(capturedOptions).not.toBeNull();
+    expect(capturedOptions.dangerouslySkipPermissions).toBeUndefined();
+  });
+});
 server/config.ts                        | 24 ++++++++++++----
 server/services/turnRunner.ts           |  5 ++--
 server/ws/handlers/chatHandler.ts       |  3 +-
 tests/server/chatHandler.bypass.test.ts | 49 +++++++++++++++++++++++++++++++++
 4 files changed, 71 insertions(+), 10 deletions(-)
