diff --git a/.superpowers/sdd/briefs/task-01-brief.md b/.superpowers/sdd/briefs/task-01-brief.md
new file mode 100644
index 0000000..bdb2213
--- /dev/null
+++ b/.superpowers/sdd/briefs/task-01-brief.md
@@ -0,0 +1,119 @@
+# Task 0.1: Lock down `dangerouslySkipPermissions` — server-side only
+
+## Context
+This is the first task of the AngryUI audit fix plan. It fixes CRITICAL security issue C-01.
+
+## Problem (from audit)
+`server/ws/handlers/chatHandler.ts:97-104` accepts `dangerouslySkipPermissions` from the client
+payload and passes it directly to the `agy` CLI subprocess. A hostile client, browser extension,
+or MITM can send `dangerouslySkipPermissions: true` and bypass ALL authorization checks.
+The server has `AGY_WEBUI_ALLOW_SKIP_PERMISSIONS` env/config but the client field overrides it.
+
+## Goal
+Remove client-controlled `dangerouslySkipPermissions` entirely. The server config
+`AGY_WEBUI_ALLOW_SKIP_PERMISSIONS` (env var + CLI flag, default false) is the SOLE source
+of truth. The client payload field must be silently ignored.
+
+## Exact Files to Modify
+
+### 1. `server/config.ts`
+Add to `getConfig()` return type:
+```typescript
+allowSkipPermissions: boolean
+```
+Add CLI flag `--allow-skip-permissions` (default false) and env var `AGY_WEBUI_ALLOW_SKIP_PERMISSIONS`.
+
+### 2. `server/services/turnRunner.ts`
+- Remove `dangerouslySkipPermissions?: boolean` from `TurnOptions` interface (around line 7-14)
+- Replace the direct usage at the spawn args (around line 63-68):
+  - Remove `const skipPerms = Boolean(opts.dangerouslySkipPermissions);`
+  - Replace with: `const allowSkip = getConfig().allowSkipPermissions;`
+  - Change args to: `...(allowSkip ? ['--dangerously-skip-permissions'] : [])`
+  - The child process env should NOT receive this as a CLI flag the client can control
+
+### 3. `server/ws/handlers/chatHandler.ts`
+Around line 93:
+```typescript
+// BEFORE:
+const { message, model, effort, dangerouslySkipPermissions, workspace } = msg.payload;
+// AFTER:
+const { message, model, effort, workspace } = msg.payload;
+```
+And around lines 97-104:
+```typescript
+// BEFORE:
+const handle = runner.spawn({ conversationId: convId, message, model, effort, dangerouslySkipPermissions, cwd: workspace });
+// AFTER:
+const handle = runner.spawn({ conversationId: convId, message, model, effort, cwd: workspace });
+```
+
+### 4. `tests/server/chatHandler.bypass.test.ts` — CREATE THIS FILE
+Regression test. The test must verify that `TurnRunner.spawn` is NEVER called with
+`dangerouslySkipPermissions` in its options, even when a malicious client sends it.
+
+```typescript
+import { describe, it, expect, vi } from 'vitest';
+import { handleChatConnection } from '../../server/ws/handlers/chatHandler';
+
+describe('dangerouslySkipPermissions bypass prevention', () => {
+  it('server must not pass dangerouslySkipPermissions from client payload to TurnRunner', async () => {
+    const fakeWs = {
+      send: vi.fn(),
+      readyState: 1, // OPEN
+      on: vi.fn(),
+      close: vi.fn(),
+    } as any;
+    const fakeIndex = { applyDelta: vi.fn() } as any;
+
+    let capturedOptions: any = null;
+    vi.stubGlobal('TurnRunner', vi.fn().mockImplementation(() => ({
+      spawn: (opts: any) => {
+        capturedOptions = opts;
+        return {
+          abort: vi.fn(), pid: 1,
+          events: { [Symbol.asyncIterator]: () => ({ next: () => Promise.resolve({ done: true }) }) }
+        };
+      },
+      quota: () => Promise.resolve(''),
+    })));
+
+    handleChatConnection(fakeWs, fakeIndex);
+
+    // Simulate the chat:send message with the forbidden field
+    const msgHandler = vi.mocked(fakeWs.on).calls.find(c => c[0] === 'message')?.[1] as (data: any) => void;
+    msgHandler(JSON.stringify({
+      type: 'chat:send',
+      conversationId: 'test-conv',
+      payload: { message: 'hello', dangerouslySkipPermissions: true }
+    }));
+
+    // Server MUST NOT forward dangerouslySkipPermissions to TurnRunner
+    expect(capturedOptions).not.toBeNull();
+    expect(capturedOptions.dangerouslySkipPermissions).toBeUndefined();
+  });
+});
+```
+
+## Test Command
+```bash
+npm test -- --run tests/server/chatHandler.bypass.test.ts
+```
+
+## Success Criteria
+1. Test written → run → FAIL (because code still forwards the field)
+2. Code changes applied → run test → PASS
+3. `npm test -- --run` → ALL tests pass (no regressions in existing 70 tests)
+4. `git add ... && git commit` with message:
+   "fix(security): remove client-controlled dangerouslySkipPermissions
+
+   - AGY_WEBUI_ALLOW_SKIP_PERMISSIONS env/config gate replaces client field
+   - Client payload field silently ignored; TurnRunner never receives it
+   - Regression test ensures field cannot be forwarded to child process
+   - Fixes C-01 (CRITICAL)"
+
+## Global Constraints (must respect)
+- TypeScript strict mode ON
+- Node 18+
+- MIT license
+- `npm test -- --run` must pass at end
+- No new runtime dependencies
diff --git a/.superpowers/sdd/briefs/task-01-diff.md b/.superpowers/sdd/briefs/task-01-diff.md
new file mode 100644
index 0000000..0d54db4
--- /dev/null
+++ b/.superpowers/sdd/briefs/task-01-diff.md
@@ -0,0 +1,177 @@
+diff --git a/server/config.ts b/server/config.ts
+index 22d4be1..83ebf6f 100644
+--- a/server/config.ts
++++ b/server/config.ts
+@@ -9,6 +9,7 @@ export interface Config {
+   agyHome: string;
+   webuiHome: string;
+   agyBin: string;
++  allowSkipPermissions: boolean;
+ }
+ 
+ function resolveAgyBin(): string {
+@@ -37,9 +38,10 @@ export function parseCliArgs(argv = process.argv.slice(2)): {
+   port?: number;
+   host?: string;
+   token?: string;
++  allowSkipPermissions?: boolean;
+   help?: boolean;
+ } {
+-  const result: { port?: number; host?: string; token?: string; help?: boolean } = {};
++  const result: { port?: number; host?: string; token?: string; allowSkipPermissions?: boolean; help?: boolean } = {};
+ 
+   for (let i = 0; i < argv.length; i++) {
+     const arg = argv[i];
+@@ -62,6 +64,11 @@ export function parseCliArgs(argv = process.argv.slice(2)): {
+       if (val) result.token = val;
+     } else if (arg.startsWith('--token=')) {
+       result.token = arg.split('=')[1];
++    } else if (arg === '--allow-skip-permissions') {
++      result.allowSkipPermissions = true;
++    } else if (arg.startsWith('--allow-skip-permissions=')) {
++      const val = arg.split('=')[1];
++      result.allowSkipPermissions = val === 'true';
+     }
+   }
+ 
+@@ -80,10 +87,11 @@ Usage:
+   node dist-server/server/index.js [options]
+ 
+ Options:
+-  -p, --port <port>       Port to listen on (default: 5173, env: AGY_WEBUI_PORT, PORT)
+-      --host <host>       Host to bind (default: 0.0.0.0, env: AGY_WEBUI_HOST)
+-  -t, --token <token>     Optional access token for API protection (env: AGY_WEBUI_TOKEN)
+-      --help              Show this help message
++  -p, --port <port>           Port to listen on (default: 5173, env: AGY_WEBUI_PORT, PORT)
++      --host <host>           Host to bind (default: 0.0.0.0, env: AGY_WEBUI_HOST)
++  -t, --token <token>         Optional access token for API protection (env: AGY_WEBUI_TOKEN)
++      --allow-skip-permissions  Allow skipping permission prompts (default: false, env: AGY_WEBUI_ALLOW_SKIP_PERMISSIONS)
++      --help                  Show this help message
+ 
+ Examples:
+   npm start -- --port 8080
+@@ -109,10 +117,16 @@ Examples:
+     process.env.AGY_WEBUI_TOKEN ??
+     null;
+ 
++  const allowSkipPermissions =
++    cli.allowSkipPermissions ??
++    process.env.AGY_WEBUI_ALLOW_SKIP_PERMISSIONS === 'true' ??
++    false;
++
+   return {
+     port,
+     host,
+     token,
++    allowSkipPermissions,
+     agyHome: path.join(os.homedir(), '.gemini', 'antigravity-cli'),
+     webuiHome: path.join(os.homedir(), '.agy-webui'),
+     agyBin: resolveAgyBin()
+diff --git a/server/services/turnRunner.ts b/server/services/turnRunner.ts
+index 7312eeb..d5fea49 100644
+--- a/server/services/turnRunner.ts
++++ b/server/services/turnRunner.ts
+@@ -9,7 +9,6 @@ export interface TurnOptions {
+   message: string;
+   model?: string;
+   effort?: 'low' | 'medium' | 'high';
+-  dangerouslySkipPermissions?: boolean;
+   cwd?: string;
+ }
+ 
+@@ -60,12 +59,12 @@ export class TurnRunner {
+     }
+ 
+     const formattedModel = formatAgyModel(opts.model, opts.effort);
+-    const skipPerms = Boolean(opts.dangerouslySkipPermissions);
++    const allowSkip = getConfig().allowSkipPermissions;
+     const args = [
+       '--conversation', opts.conversationId,
+       '--add-dir', runCwd,
+       ...(formattedModel ? ['--model', formattedModel] : []),
+-      ...(skipPerms ? ['--dangerously-skip-permissions'] : []),
++      ...(allowSkip ? ['--dangerously-skip-permissions'] : []),
+       '--output-format', 'stream-json',
+       '--print', opts.message
+     ];
+diff --git a/server/ws/handlers/chatHandler.ts b/server/ws/handlers/chatHandler.ts
+index 7f6bc56..2cc9047 100644
+--- a/server/ws/handlers/chatHandler.ts
++++ b/server/ws/handlers/chatHandler.ts
+@@ -90,7 +90,7 @@ export function handleChatConnection(ws: WebSocket, _index: ConversationIndex):
+ 
+     if (msg.type === 'chat:send' && msg.conversationId && msg.payload) {
+       const convId = msg.conversationId;
+-      const { message, model, effort, dangerouslySkipPermissions, workspace } = msg.payload;
++      const { message, model, effort, workspace } = msg.payload;
+ 
+       subscribeConversation(convId);
+ 
+@@ -99,7 +99,6 @@ export function handleChatConnection(ws: WebSocket, _index: ConversationIndex):
+         message,
+         model,
+         effort,
+-        dangerouslySkipPermissions,
+         cwd: workspace
+       });
+ 
+diff --git a/tests/server/chatHandler.bypass.test.ts b/tests/server/chatHandler.bypass.test.ts
+new file mode 100644
+index 0000000..960baf9
+--- /dev/null
++++ b/tests/server/chatHandler.bypass.test.ts
+@@ -0,0 +1,49 @@
++import { describe, it, expect, vi, beforeEach } from 'vitest';
++import { handleChatConnection } from '../../server/ws/handlers/chatHandler';
++
++// We need to mock the TurnRunner module since it's imported at module level
++vi.mock('../../server/services/turnRunner', () => ({
++  TurnRunner: class {
++    spawn(opts: any) {
++      // Store the options globally for test inspection
++      (globalThis as any).__test_capturedOptions = opts;
++      return {
++        abort: vi.fn(), pid: 1,
++        events: { [Symbol.asyncIterator]: () => ({ next: () => Promise.resolve({ done: true }) }) }
++      };
++    }
++    quota() { return Promise.resolve(''); }
++  },
++}));
++
++describe('dangerouslySkipPermissions bypass prevention', () => {
++  beforeEach(() => {
++    (globalThis as any).__test_capturedOptions = null;
++  });
++
++  it('server must not pass dangerouslySkipPermissions from client payload to TurnRunner', async () => {
++    const fakeWs = {
++      send: vi.fn(),
++      readyState: 1, // OPEN
++      on: vi.fn((event: string, handler: any) => {
++        if (event === 'message') {
++          // Immediately trigger the handler with our test message
++          handler(JSON.stringify({
++            type: 'chat:send',
++            conversationId: 'test-conv',
++            payload: { message: 'hello', dangerouslySkipPermissions: true }
++          }));
++        }
++      }),
++      close: vi.fn(),
++    } as any;
++    const fakeIndex = { applyDelta: vi.fn() } as any;
++
++    handleChatConnection(fakeWs, fakeIndex);
++
++    // Server MUST NOT forward dangerouslySkipPermissions to TurnRunner
++    const capturedOptions = (globalThis as any).__test_capturedOptions;
++    expect(capturedOptions).not.toBeNull();
++    expect(capturedOptions.dangerouslySkipPermissions).toBeUndefined();
++  });
++});
+ server/config.ts                        | 24 ++++++++++++----
+ server/services/turnRunner.ts           |  5 ++--
+ server/ws/handlers/chatHandler.ts       |  3 +-
+ tests/server/chatHandler.bypass.test.ts | 49 +++++++++++++++++++++++++++++++++
+ 4 files changed, 71 insertions(+), 10 deletions(-)
diff --git a/.superpowers/sdd/briefs/task-01-report.md b/.superpowers/sdd/briefs/task-01-report.md
new file mode 100644
index 0000000..5f837de
--- /dev/null
+++ b/.superpowers/sdd/briefs/task-01-report.md
@@ -0,0 +1,33 @@
+# Task 0.1 Report: Lock down `dangerouslySkipPermissions` — server-side only
+
+## Summary
+Fixed CRITICAL security issue C-01: client-controlled `dangerouslySkipPermissions` field allowed bypassing all authorization checks.
+
+## Changes Made
+
+### 1. server/config.ts
+- Added `allowSkipPermissions: boolean` to `Config` interface
+- Added `--allow-skip-permissions` CLI flag (default: false)
+- Added support for `AGY_WEBUI_ALLOW_SKIP_PERMISSIONS` env var
+- Updated help text
+
+### 2. server/services/turnRunner.ts
+- Removed `dangerouslySkipPermissions?: boolean` from `TurnOptions` interface
+- Changed spawn args to use `getConfig().allowSkipPermissions` instead of client-controlled option
+
+### 3. server/ws/handlers/chatHandler.ts
+- Removed `dangerouslySkipPermissions` from destructuring client payload
+- Removed `dangerouslySkipPermissions` from spawn call options
+
+### 4. tests/server/chatHandler.bypass.test.ts (NEW)
+- Regression test that verifies `TurnRunner.spawn` is NEVER called with `dangerouslySkipPermissions`
+
+## Test Results
+- Regression test: PASSED (previously failed before fix)
+- All 84 tests: PASSED (no regressions)
+- Commit: 0efbf21
+
+## Security Impact
+- Client payload `dangerouslySkipPermissions` field is now silently ignored
+- Only server-side config (`AGY_WEBUI_ALLOW_SKIP_PERMISSIONS` env/flag) can enable skip permissions
+- Fixes C-01 (CRITICAL) vulnerability
diff --git a/.superpowers/sdd/briefs/task-02-brief.md b/.superpowers/sdd/briefs/task-02-brief.md
new file mode 100644
index 0000000..b75ead7
--- /dev/null
+++ b/.superpowers/sdd/briefs/task-02-brief.md
@@ -0,0 +1,170 @@
+# Task 0.2: Client sends Bearer token + login screen when unauthenticated
+
+## Context
+This is Task 2 of the AngryUI audit fix plan. It fixes CRITICAL issue A-02:
+the server accepts Bearer token but the client never sends it.
+Project: /Users/jason/myprojects/angryui (React 19 + TypeScript + Express + node-pty).
+Current HEAD after Task 0.1: 0efbf21b2a285e2dc5a3c73291e60c5d84d8121c
+
+## Problem
+`server/utils/tokens.ts` has Bearer token validation middleware, but:
+1. The client (`src/`) never stores or sends any token
+2. Even with `--token` configured, anyone can access the API anonymously
+3. No login screen when token is required
+
+## Goal
+- Client stores token in sessionStorage
+- All API fetch calls inject `Authorization: Bearer <token>`
+- WS connects with `?token=<token>` query param (server already checks this in `tokens.ts:10`)
+- When no token is stored, show a minimal LoginScreen
+- Token syncs across browser tabs via BroadcastChannel
+
+## Files to Create or Modify
+
+### 1. `src/lib/auth.ts` — CREATE
+```typescript
+// src/lib/auth.ts
+const TOKEN_KEY = 'angryui_auth_token';
+
+export function getStoredToken(): string | null {
+  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
+}
+export function setStoredToken(token: string): void {
+  try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* blocked */ }
+}
+export function clearStoredToken(): void { sessionStorage.removeItem(TOKEN_KEY); }
+
+// Broadcast token changes across tabs
+const _ch = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('angryui_auth') : null;
+export function broadcastTokenChange(token: string | null): void { _ch?.postMessage({ type: 'token_change', token }); }
+```
+
+### 2. `src/context/AuthContext.tsx` — CREATE
+```tsx
+// src/context/AuthContext.tsx
+import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
+import { getStoredToken, setStoredToken, clearStoredToken, broadcastTokenChange } from '@/lib/auth';
+
+interface AuthContextValue { token: string | null; isAuthenticated: boolean; login: (t: string) => void; logout: () => void; }
+export const AuthContext = createContext<AuthContextValue>({ token: null, isAuthenticated: false, login: () => {}, logout: () => {} });
+export const useAuth = () => useContext(AuthContext);
+
+export function AuthProvider({ children }: { children: ReactNode }) {
+  const [token, setToken] = useState<string | null>(getStoredToken);
+  useEffect(() => {
+    const ch = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('angryui_auth') : null;
+    const h = (e: MessageEvent) => { if (e.data?.type === 'token_change') setToken(e.data.token); };
+    ch?.addEventListener('message', h);
+    return () => ch?.removeEventListener('message', h);
+  }, []);
+  const login = (t: string) => { setStoredToken(t); broadcastTokenChange(t); setToken(t); };
+  const logout = () => { clearStoredToken(); broadcastTokenChange(null); setToken(null); };
+  return <AuthContext.Provider value={{ token, isAuthenticated: token !== null, login, logout }}>{children}</AuthContext.Provider>;
+}
+```
+
+### 3. `src/lib/api.ts` — MODIFY
+Add `authFetch()` wrapper, replace ALL `fetch()` calls with `authFetch()`.
+The `/api/upload` call in `ChatInput.tsx` also needs this — for simplicity, also inline the token inject there.
+
+```typescript
+// At top of src/lib/api.ts, add:
+import { getStoredToken } from './auth';
+
+export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
+  const token = getStoredToken();
+  const headers = new Headers(init?.headers);
+  if (token) headers.set('Authorization', `Bearer ${token}`);
+  return fetch(url, { ...init, headers });
+}
+
+// Then replace all fetch(url) with authFetch(url) and
+// fetch(url, init) with authFetch(url, init)
+```
+
+### 4. `src/hooks/useWebSocket.ts` — MODIFY
+Around line 15, change:
+```typescript
+// BEFORE:
+const ws = new WebSocket(url);
+
+// AFTER:
+const token = getStoredToken();
+const wsUrl = token
+  ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
+  : url;
+const ws = new WebSocket(wsUrl);
+```
+Add import: `import { getStoredToken } from '@/lib/auth';` at the top.
+
+### 5. `src/App.tsx` — MODIFY
+Wrap the app with AuthProvider. Add a minimal LoginScreen shown when `!isAuthenticated`.
+
+```tsx
+// Add near top:
+import { AuthProvider, useAuth } from '@/context/AuthContext';
+
+// Minimal login screen component inside App.tsx or as separate inline:
+function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
+  const [val, setVal] = useState('');
+  return (
+    <div className="flex h-screen items-center justify-center">
+      <form onSubmit={e => { e.preventDefault(); onLogin(val); }} className="flex flex-col gap-3">
+        <h1 className="text-xl font-bold">AngryUI</h1>
+        <input type="password" value={val} onChange={e => setVal(e.target.value)}
+          placeholder="Enter access token" className="border rounded px-3 py-2" autoFocus />
+        <button type="submit" className="bg-primary text-primary-foreground rounded px-4 py-2">
+          Connect
+        </button>
+      </form>
+    </div>
+  );
+}
+
+// Wrap return with AuthProvider at root level; show LoginScreen when !isAuthenticated
+// e.g.: return <AuthProvider><Inner /></AuthProvider>;
+// where Inner reads useAuth() and conditionally renders LoginScreen or the real app
+```
+
+### 6. `server/utils/tokens.ts` — MODIFY line ~23
+```typescript
+// BEFORE:
+res.status(401).json({ error: 'Unauthorized' });
+
+// AFTER:
+res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED', requestId: (req as any).requestId });
+```
+Note: This requires `req.requestId` to exist. If `index.ts` has a requestId middleware that sets it, use that. If not yet, just use a generated ID or omit `requestId` here for now (Phase 1 Task 1.4 adds the middleware).
+
+### 7. `src/components/chat/ChatInput.tsx` — MODIFY the `/api/upload` fetch
+Around line 222, update the fetch call:
+```typescript
+import { getStoredToken } from '@/lib/auth';
+// Inside handleSubmit, before the fetch:
+const token = getStoredToken();
+const hdrs = { 'Content-Type': 'application/json' };
+if (token) hdrs['Authorization'] = `Bearer ${token}`;
+const res = await fetch('/api/upload', { method: 'POST', headers: hdrs, body: ... });
+```
+
+## Test Strategy
+- Manual test: run `npm run dev`, verify:
+  1. No token → login screen appears
+  2. Enter correct token → main UI loads
+  3. All API calls in Network tab carry `Authorization: Bearer <token>` header
+  4. Open two tabs, login on one → other tab syncs (BroadcastChannel)
+  5. WS connects with `?token=` in URL
+
+## Success Criteria
+1. `npm test -- --run` → ALL tests pass (existing tests must not regress)
+2. New auth files compile without TypeScript errors
+3. Login flow works manually
+4. `git commit` with message:
+   "feat(auth): client sends Bearer token, session-based login, cross-tab sync"
+
+## Global Constraints
+- TypeScript strict mode ON
+- Node 18+
+- MIT license
+- `npm test -- --run` must pass
+- No new runtime dependencies (BroadcastChannel is native)
diff --git a/.superpowers/sdd/progress.md b/.superpowers/sdd/progress.md
new file mode 100644
index 0000000..4a04b36
--- /dev/null
+++ b/.superpowers/sdd/progress.md
@@ -0,0 +1,13 @@
+# AngryUI Audit Fixes — SDD Progress Ledger
+
+Started: 2026-08-19
+Branch: main
+Plan: docs/superpowers/plans/2026-08-19-angryui-audit-fixes.md (in-memory — not on disk)
+
+## Task Status
+
+## Task 0.1: COMPLETE (2026-08-19)
+- Commit: 0efbf21 fix(security): remove client-controlled dangerouslySkipPermissions
+- Review: Approved (84 tests pass, 1 new regression test)
+- Issue noted: package.json license "ISC" (≡ MIT, Minor) — not fixed, no functional impact
+- Next: Task 0.2 (client token + login screen)
diff --git a/server/utils/tokens.ts b/server/utils/tokens.ts
index 3e090b1..f708bc8 100644
--- a/server/utils/tokens.ts
+++ b/server/utils/tokens.ts
@@ -20,7 +20,7 @@ export function checkToken(req: IncomingMessage, expected: string | null): boole
 export function requireAuth(expected: string | null) {
   return (req: Request, res: Response, next: NextFunction): void => {
     if (!checkToken(req, expected)) {
-      res.status(401).json({ error: 'Unauthorized' });
+      res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED', requestId: (req as any).requestId });
       return;
     }
     next();
diff --git a/src/App.tsx b/src/App.tsx
index 575ed8a..c1f07b3 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -1,12 +1,30 @@
+import { useState } from 'react';
 import { BrowserRouter, Routes, Route } from 'react-router-dom';
 import { SidebarProvider, useSidebar } from './context/SidebarContext';
 import { SessionStatusProvider } from './context/SessionStatusContext';
 import { LanguageProvider, useLanguage } from './context/LanguageContext';
+import { AuthProvider, useAuth } from './context/AuthContext';
 import { Sidebar } from './components/sidebar/Sidebar';
 import { ChatPage } from './pages/ChatPage';
 import { SettingsPage } from './pages/SettingsPage';
 import { PanelLeftOpen } from 'lucide-react';
 
+function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
+  const [val, setVal] = useState('');
+  return (
+    <div className="flex h-screen items-center justify-center">
+      <form onSubmit={e => { e.preventDefault(); onLogin(val); }} className="flex flex-col gap-3">
+        <h1 className="text-xl font-bold">AngryUI</h1>
+        <input type="password" value={val} onChange={e => setVal(e.target.value)}
+          placeholder="Enter access token" className="border rounded px-3 py-2" autoFocus />
+        <button type="submit" className="bg-primary text-primary-foreground rounded px-4 py-2">
+          Connect
+        </button>
+      </form>
+    </div>
+  );
+}
+
 function HomePage() {
   const { toggleSidebar } = useSidebar();
   const { t } = useLanguage();
@@ -33,23 +51,37 @@ function HomePage() {
   );
 }
 
+function AppContent() {
+  const { isAuthenticated, login } = useAuth();
+
+  if (!isAuthenticated) {
+    return <LoginScreen onLogin={login} />;
+  }
+
+  return (
+    <SidebarProvider>
+      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
+        <Sidebar />
+        <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
+          <Routes>
+            <Route path="/" element={<HomePage />} />
+            <Route path="/chat/:conversationId" element={<ChatPage />} />
+            <Route path="/settings" element={<SettingsPage />} />
+          </Routes>
+        </main>
+      </div>
+    </SidebarProvider>
+  );
+}
+
 export default function App() {
   return (
     <BrowserRouter>
       <LanguageProvider>
         <SessionStatusProvider>
-          <SidebarProvider>
-            <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
-              <Sidebar />
-              <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
-                <Routes>
-                  <Route path="/" element={<HomePage />} />
-                  <Route path="/chat/:conversationId" element={<ChatPage />} />
-                  <Route path="/settings" element={<SettingsPage />} />
-                </Routes>
-              </main>
-            </div>
-          </SidebarProvider>
+          <AuthProvider>
+            <AppContent />
+          </AuthProvider>
         </SessionStatusProvider>
       </LanguageProvider>
     </BrowserRouter>
diff --git a/src/components/chat/ChatInput.tsx b/src/components/chat/ChatInput.tsx
index 262b89a..72c13bc 100644
--- a/src/components/chat/ChatInput.tsx
+++ b/src/components/chat/ChatInput.tsx
@@ -12,6 +12,7 @@ import {
 import { Send, Square, Paperclip, X, FileText, Loader2 } from 'lucide-react';
 import { useLanguage } from '@/context/LanguageContext';
 import { generateUUID } from '@/lib/uuid';
+import { getStoredToken } from '@/lib/auth';
 
 export interface ChatInputHandle {
   insertSnippet: (snippet: string) => void;
@@ -219,9 +220,12 @@ export const ChatInput = forwardRef<
           }))
         );
 
+        const token = getStoredToken();
+        const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
+        if (token) hdrs['Authorization'] = `Bearer ${token}`;
         const res = await fetch('/api/upload', {
           method: 'POST',
-          headers: { 'Content-Type': 'application/json' },
+          headers: hdrs,
           body: JSON.stringify({
             conversationId: conversationId || 'default',
             files: payloadFiles
diff --git a/src/context/AuthContext.tsx b/src/context/AuthContext.tsx
new file mode 100644
index 0000000..47ac4ba
--- /dev/null
+++ b/src/context/AuthContext.tsx
@@ -0,0 +1,20 @@
+// src/context/AuthContext.tsx
+import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
+import { getStoredToken, setStoredToken, clearStoredToken, broadcastTokenChange } from '@/lib/auth';
+
+interface AuthContextValue { token: string | null; isAuthenticated: boolean; login: (t: string) => void; logout: () => void; }
+export const AuthContext = createContext<AuthContextValue>({ token: null, isAuthenticated: false, login: () => {}, logout: () => {} });
+export const useAuth = () => useContext(AuthContext);
+
+export function AuthProvider({ children }: { children: ReactNode }) {
+  const [token, setToken] = useState<string | null>(getStoredToken);
+  useEffect(() => {
+    const ch = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('angryui_auth') : null;
+    const h = (e: MessageEvent) => { if (e.data?.type === 'token_change') setToken(e.data.token); };
+    ch?.addEventListener('message', h);
+    return () => ch?.removeEventListener('message', h);
+  }, []);
+  const login = (t: string) => { setStoredToken(t); broadcastTokenChange(t); setToken(t); };
+  const logout = () => { clearStoredToken(); broadcastTokenChange(null); setToken(null); };
+  return <AuthContext.Provider value={{ token, isAuthenticated: token !== null, login, logout }}>{children}</AuthContext.Provider>;
+}
diff --git a/src/hooks/useWebSocket.ts b/src/hooks/useWebSocket.ts
index 92a62fc..c8119c4 100644
--- a/src/hooks/useWebSocket.ts
+++ b/src/hooks/useWebSocket.ts
@@ -1,5 +1,6 @@
 import { useEffect, useRef, useState, useCallback } from 'react';
 import type { WSMessage } from '@/lib/types';
+import { getStoredToken } from '@/lib/auth';
 
 export function useWebSocket(url: string, onMessage?: (msg: WSMessage) => void) {
   const wsRef = useRef<WebSocket | null>(null);
@@ -12,7 +13,11 @@ export function useWebSocket(url: string, onMessage?: (msg: WSMessage) => void)
   const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 
   const connect = useCallback(() => {
-    const ws = new WebSocket(url);
+    const token = getStoredToken();
+    const wsUrl = token
+      ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
+      : url;
+    const ws = new WebSocket(wsUrl);
     wsRef.current = ws;
     setReadyState(WebSocket.CONNECTING);
 
diff --git a/src/lib/api.ts b/src/lib/api.ts
index 4c6c3c0..904519f 100644
--- a/src/lib/api.ts
+++ b/src/lib/api.ts
@@ -1,4 +1,12 @@
 import type { ConversationSummary } from './types';
+import { getStoredToken } from './auth';
+
+export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
+  const token = getStoredToken();
+  const headers = new Headers(init?.headers);
+  if (token) headers.set('Authorization', `Bearer ${token}`);
+  return fetch(url, { ...init, headers });
+}
 
 export interface ProjectsResponse {
   groups: Array<{ workspace: string; conversations: ConversationSummary[] }>;
@@ -27,7 +35,7 @@ export async function fetchConversationHistory(
   turns = 5,
   offset = 0
 ): Promise<HistoryResponse> {
-  const res = await fetch(
+  const res = await authFetch(
     `/api/conversations/${encodeURIComponent(conversationId)}/history?turns=${turns}&offset=${offset}`
   );
   if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
@@ -36,13 +44,13 @@ export async function fetchConversationHistory(
 
 export async function fetchProjects(showArchived = false): Promise<ProjectsResponse> {
   const url = `/api/projects${showArchived ? '?showArchived=true' : ''}`;
-  const res = await fetch(url);
+  const res = await authFetch(url);
   if (!res.ok) throw new Error(`Failed: ${res.status}`);
   return res.json();
 }
 
 export async function renameConversation(id: string, title: string): Promise<{ success: boolean; conversation_id: string; title: string }> {
-  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}/rename`, {
+  const res = await authFetch(`/api/conversations/${encodeURIComponent(id)}/rename`, {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ title })
@@ -52,7 +60,7 @@ export async function renameConversation(id: string, title: string): Promise<{ s
 }
 
 export async function archiveConversation(id: string, archived = true): Promise<{ success: boolean; conversation_id: string; is_archived: boolean }> {
-  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}/archive`, {
+  const res = await authFetch(`/api/conversations/${encodeURIComponent(id)}/archive`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ archived })
@@ -62,7 +70,7 @@ export async function archiveConversation(id: string, archived = true): Promise<
 }
 
 export async function deleteConversation(id: string): Promise<{ success: boolean; conversation_id: string }> {
-  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
+  const res = await authFetch(`/api/conversations/${encodeURIComponent(id)}`, {
     method: 'DELETE'
   });
   if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`);
@@ -70,13 +78,13 @@ export async function deleteConversation(id: string): Promise<{ success: boolean
 }
 
 export async function fetchPermissions(): Promise<{ allow: string[] }> {
-  const res = await fetch('/api/settings/permissions');
+  const res = await authFetch('/api/settings/permissions');
   if (!res.ok) throw new Error(`Failed: ${res.status}`);
   return res.json();
 }
 
 export async function addPermission(pattern: string): Promise<void> {
-  await fetch('/api/settings/permissions', {
+  await authFetch('/api/settings/permissions', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ pattern })
@@ -84,7 +92,7 @@ export async function addPermission(pattern: string): Promise<void> {
 }
 
 export async function removePermission(pattern: string): Promise<void> {
-  await fetch(`/api/settings/permissions/${encodeURIComponent(pattern)}`, {
+  await authFetch(`/api/settings/permissions/${encodeURIComponent(pattern)}`, {
     method: 'DELETE'
   });
 }
diff --git a/src/lib/auth.ts b/src/lib/auth.ts
new file mode 100644
index 0000000..7f2a540
--- /dev/null
+++ b/src/lib/auth.ts
@@ -0,0 +1,14 @@
+// src/lib/auth.ts
+const TOKEN_KEY = 'angryui_auth_token';
+
+export function getStoredToken(): string | null {
+  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
+}
+export function setStoredToken(token: string): void {
+  try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* blocked */ }
+}
+export function clearStoredToken(): void { sessionStorage.removeItem(TOKEN_KEY); }
+
+// Broadcast token changes across tabs
+const _ch = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('angryui_auth') : null;
+export function broadcastTokenChange(token: string | null): void { _ch?.postMessage({ type: 'token_change', token }); }
 .superpowers/sdd/briefs/task-01-brief.md  | 119 ++++++++++++++++++++
 .superpowers/sdd/briefs/task-01-diff.md   | 177 ++++++++++++++++++++++++++++++
 .superpowers/sdd/briefs/task-01-report.md |  33 ++++++
 .superpowers/sdd/briefs/task-02-brief.md  | 170 ++++++++++++++++++++++++++++
 .superpowers/sdd/progress.md              |  13 +++
 server/utils/tokens.ts                    |   2 +-
 src/App.tsx                               |  56 ++++++++--
 src/components/chat/ChatInput.tsx         |   6 +-
 src/context/AuthContext.tsx               |  20 ++++
 src/hooks/useWebSocket.ts                 |   7 +-
 src/lib/api.ts                            |  24 ++--
 src/lib/auth.ts                           |  14 +++
 12 files changed, 618 insertions(+), 23 deletions(-)
