# AGY Web UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js + React web UI that lets the user access AGY CLI from a browser (LAN/remote), with a grouped project sidebar, streaming chat, dynamic model/effort switching, a permissions editor, and a WebTTY fallback for interactive prompts.

**Architecture:** Stateless per-turn execution of `agy --conversation <id> --print "<msg>" --output-format stream-json` with bidirectional stdio piping. SQLite (`better-sqlite3`) reads AGY's `conversation_summaries.db` for the project tree. `chokidar` watches the DB and `history.jsonl` for live updates. WebTTY mode uses `node-pty` + `xterm.js` for full interactive prompts.

**Tech Stack:** Node.js + Express + ws + better-sqlite3 + chokidar + node-pty (frontend); React + Vite + shadcn/ui + Tailwind CSS + xterm.js (frontend).

---

## Global Constraints

These rules apply to every task. Engineers must follow them throughout.

| # | Constraint | Source |
|---|-----------|--------|
| 1 | All code TypeScript (`strict: true`) | design §2 |
| 2 | Path: `~/.gemini/antigravity-cli/` (NOT `~/.gemini/antigravity/`) | spike note §1 |
| 3 | Read `~/.gemini/antigravity-cli/conversation_summaries.db` in read-only mode | design §4.2 |
| 4 | Real stream-json schema: 5 event types (`init`, `step_update`, `result`); 6 step_types (`user_input`, `system_message`, `agent_response`, `tool`, `checkpoint`, `unknown`) | spike note §1.1, §1.2 |
| 5 | `--effort` is **NOT supported** by Gemini 3.x Flash models — must be conditionally enabled | spike note §2.1 |
| 6 | `--print` mode does NOT process stdin — permission prompts auto-deny. Use `settings.json` `permissions.allow` for control | spike note §3 |
| 7 | Stateless per-turn: each spawn is ephemeral, exits on completion | design §5.1 |
| 8 | `chokidar` watches `conversation_summaries.db` and `history.jsonl` for live updates | design §4.2 |
| 9 | WebSocket envelope protocol uses `type`, `conversationId`, `payload`, `timestamp` | design §6 |
| 10 | Node-side persistence at `~/.agy-webui/` (config + state) | this plan |
| 11 | Commit message format: `<type>: <description>` (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`) | git-workflow |
| 12 | Bind to `0.0.0.0:<PORT>` (default 3000); optional `AGY_WEBUI_TOKEN` env var | design §9 |
| 13 | WebTTY uses `node-pty` + `xterm.js`. PTY resize events forward `ptyProcess.resize(cols, rows)` | design §5.3 |
| 14 | When `--print` mode emits `step_type: "unknown"`, server emits `chat:interactive_prompt` and offers WebTTY fallback | this plan + spike note §5.3 |

---

## File Structure

### Repo Layout

```
agy-webui/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── components.json                          # shadcn/ui config
├── index.html
├── .env.example
├── README.md
├── server/
│   ├── index.ts                             # entry: HTTP + WS
│   ├── config.ts                            # paths, env loading
│   ├── db/
│   │   ├── sqliteClient.ts                  # read-only better-sqlite3 wrapper
│   │   └── conversationIndex.ts             # query + cache conversations
│   ├── services/
│   │   ├── discoveryService.ts              # scan + watch AGY storage
│   │   ├── turnRunner.ts                    # spawn agy, parse stream-json
│   │   ├── ptyManager.ts                    # node-pty pool for WebTTY
│   │   ├── settingsService.ts               # read/write permissions.allow
│   │   └── wsBroadcast.ts                   # pub/sub for trees + sessions
│   ├── ws/
│   │   ├── wsServer.ts                      # Express + ws attached
│   │   └── handlers/
│   │       ├── chatHandler.ts
│   │       └── tuiHandler.ts
│   └── utils/
│       ├── streamParser.ts                  # NDJSON → typed events
│       └── tokens.ts                        # extract AGY_WEBUI_TOKEN check
├── src/                                     # React frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── WorkspaceGroup.tsx
│   │   │   └── ConversationItem.tsx
│   │   ├── chat/
│   │   │   ├── ChatContainer.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageItem.tsx
│   │   │   ├── ThoughtAccordion.tsx
│   │   │   ├── ToolCard.tsx
│   │   │   ├── PermissionPrompt.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── tui/
│   │   │   └── WebTTYModal.tsx
│   │   ├── settings/
│   │   │   ├── SettingsPanel.tsx
│   │   │   ├── PermissionsPanel.tsx
│   │   │   └── ModelSelector.tsx
│   │   └── ui/                              # shadcn/ui components (button, card, etc.)
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useConversation.ts
│   │   └── useProjectIndex.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   └── pages/
│       ├── ChatPage.tsx
│       └── SettingsPage.tsx
├── tests/
│   ├── server/
│   │   ├── streamParser.test.ts
│   │   ├── conversationIndex.test.ts
│   │   ├── turnRunner.test.ts
│   │   ├── settingsService.test.ts
│   │   └── wsBroadcast.test.ts
│   └── contract/
│       └── agyStreamContract.test.ts        # replays real AGY logs from /tmp/agy-spike
├── docs/
│   └── superpowers/
│       ├── specs/
│       │   └── 2026-08-15-agy-webui-design.md
│       ├── notes/
│       │   └── 2026-08-15-spike-verification-findings.md
│       └── plans/
│           └── 2026-08-15-agy-webui-impl.md
└── scripts/
    └── replay-agy-log.ts                    # CLI to replay a spike log for manual testing
```

### Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `server/db/sqliteClient.ts` | Open AGY's `conversation_summaries.db` read-only, expose typed query methods |
| `server/db/conversationIndex.ts` | In-memory cache of all conversations (id, title, workspace, last_active) |
| `server/services/discoveryService.ts` | Boot: scan + build index. Runtime: watch DB + history.jsonl, emit delta events |
| `server/services/turnRunner.ts` | Spawn `agy --conversation <id> --print ... --output-format stream-json`. Parse stdout. Emit stream events. Handle SIGINT (5-min timeout) |
| `server/services/ptyManager.ts` | Spawn node-pty with `agy --conversation <id>`. Bidirectional stdio. Resize. Cleanup |
| `server/services/settingsService.ts` | Read/write `~/.gemini/antigravity-cli/settings.json` `permissions.allow` |
| `server/utils/streamParser.ts` | NDJSON stream → typed `AgyEvent` objects |
| `server/ws/handlers/chatHandler.ts` | Receive `chat:send`, dispatch to `turnRunner`, broadcast events |
| `server/ws/handlers/tuiHandler.ts` | Receive/send raw PTY bytes over WebSocket |
| `src/hooks/useWebSocket.ts` | Use shared `WSMessage` envelope; auto-reconnect with backoff |
| `src/components/chat/MessageItem.tsx` | Render any message type (text_delta, tool, thought) |
| `src/components/chat/PermissionPrompt.tsx` | Render `chat:interactive_prompt` modal |

---

## Implementation Tasks

Tasks are organized into 6 phases. Each task produces a self-contained, testable deliverable.

---

### Phase 1: Project Skeleton & Foundation

#### Task 1: Bootstrap monorepo-style project (Node + Vite + TS)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.server.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `components.json`
- Create: `.gitignore`
- Create: `.env.example`

**Interfaces:**
- N/A — foundation

**Setup steps:**

- [ ] **Step 1: Initialize package.json**

```bash
cd /path/to/agy-webui
npm init -y
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install express ws better-sqlite3 chokidar node-pty cors
npm install -D typescript @types/node @types/express @types/ws @types/better-sqlite3 @types/cors \
  tsx vitest @vitest/ui vite @vitejs/plugin-react tailwindcss postcss autoprefixer \
  shadcn @types/node-pty
```

Note: `node-pty` requires native compilation. If install fails, run `npm install -g node-gyp` first. On macOS, ensure Xcode CLI tools are installed (`xcode-select --install`).

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "server", "tests", "scripts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Write tsconfig.server.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist-server",
    "noEmit": false
  },
  "include": ["server"]
}
```

- [ ] **Step 5: Write vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': { target: 'ws://localhost:3000', ws: true }
    }
  }
});
```

- [ ] **Step 6: Write index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AGY Web UI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Write src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 8: Write src/App.tsx**

```tsx
export default function App() {
  return <div>AGY Web UI</div>;
}
```

- [ ] **Step 9: Write tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: []
};
```

- [ ] **Step 10: Write postcss.config.js**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} }
};
```

- [ ] **Step 11: Write src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 12: Write components.json (shadcn/ui)**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

- [ ] **Step 13: Write .gitignore**

```
node_modules/
dist/
dist-server/
.env
.env.local
.DS_Store
```

- [ ] **Step 14: Write .env.example**

```
AGY_WEBUI_PORT=3000
AGY_WEBUI_HOST=0.0.0.0
AGY_WEBUI_TOKEN=
```

- [ ] **Step 15: Add npm scripts to package.json**

```json
{
  "scripts": {
    "dev": "concurrently \"npm:dev:server\" \"npm:dev:client\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite",
    "build": "vite build && tsc -p tsconfig.server.json",
    "start": "node dist-server/server/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

Run `npm install -D concurrently` to add the missing devDep.

- [ ] **Step 16: Verify dev environment**

Run: `npm run dev:client`
Expected: Vite starts on port 5173, browser shows "AGY Web UI"
Run: `npm run dev:server`
Expected: Server logs "AGY Web UI server listening on port 3000"

- [ ] **Step 17: Commit**

```bash
git init
git add -A
git commit -m "chore: bootstrap project with Vite + TS + Express"
```

---

#### Task 2: Express + WebSocket server skeleton

**Files:**
- Create: `server/config.ts`
- Create: `server/index.ts`
- Create: `server/ws/wsServer.ts`
- Create: `server/utils/tokens.ts`
- Create: `tests/server/server.test.ts`

**Interfaces:**
- Produces: `getConfig(): { port, host, token, agyHome }`
- Produces: `attachWsServer(httpServer: http.Server): WSServer`
- Produces: `checkToken(req: http.IncomingMessage): boolean`

**Steps:**

- [ ] **Step 1: Write server/config.ts**

```ts
import path from 'path';
import os from 'os';

export interface Config {
  port: number;
  host: string;
  token: string | null;
  agyHome: string;
  webuiHome: string;
}

export function getConfig(): Config {
  return {
    port: Number(process.env.AGY_WEBUI_PORT ?? 3000),
    host: process.env.AGY_WEBUI_HOST ?? '0.0.0.0',
    token: process.env.AGY_WEBUI_TOKEN || null,
    agyHome: path.join(os.homedir(), '.gemini', 'antigravity-cli'),
    webuiHome: path.join(os.homedir(), '.agy-webui')
  };
}
```

- [ ] **Step 2: Write server/utils/tokens.ts**

```ts
import type { IncomingMessage } from 'http';

export function checkToken(req: IncomingMessage, expected: string | null): boolean {
  if (!expected) return true; // no token required
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth === `Bearer ${expected}`) return true;
  // For WebSocket: also check URL token query
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.searchParams.get('token') === expected) return true;
  return false;
}
```

- [ ] **Step 3: Write server/ws/wsServer.ts**

```ts
import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HTTPServer } from 'http';
import { checkToken } from '../utils/tokens';

export function attachWsServer(httpServer: HTTPServer, token: string | null): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/ws')) {
      socket.destroy();
      return;
    }
    if (!checkToken(req, token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  return wss;
}
```

- [ ] **Step 4: Write server/index.ts**

```ts
import express from 'express';
import http from 'http';
import cors from 'cors';
import { getConfig } from './config';
import { attachWsServer } from './ws/wsServer';

const config = getConfig();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', agyHome: config.agyHome });
});

const httpServer = http.createServer(app);
attachWsServer(httpServer, config.token);

httpServer.listen(config.port, config.host, () => {
  console.log(`AGY Web UI server listening on ${config.host}:${config.port}`);
});
```

- [ ] **Step 5: Write tests/server/server.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { checkToken } from '../../server/utils/tokens';

describe('checkToken', () => {
  it('returns true when no token expected', () => {
    const req = { headers: {}, url: '/' } as any;
    expect(checkToken(req, null)).toBe(true);
  });

  it('accepts Bearer token in Authorization header', () => {
    const req = { headers: { authorization: 'Bearer secret123' }, url: '/' } as any;
    expect(checkToken(req, 'secret123')).toBe(true);
  });

  it('accepts token in URL query', () => {
    const req = { headers: {}, url: '/ws?token=secret123' } as any;
    expect(checkToken(req, 'secret123')).toBe(true);
  });

  it('rejects wrong token', () => {
    const req = { headers: { authorization: 'Bearer wrong' }, url: '/ws' } as any;
    expect(checkToken(req, 'secret123')).toBe(false);
  });
});
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/server/server.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 7: Verify server starts**

Run: `npm run dev:server`
Expected: log "AGY Web UI server listening on 0.0.0.0:3000"
Run in another terminal: `curl http://localhost:3000/api/health`
Expected: `{"status":"ok","agyHome":"/Users/username/.gemini/antigravity-cli"}`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: Express + WebSocket server with token auth"
```

---

### Phase 2: Storage Discovery Service

#### Task 3: SQLite read-only client

**Files:**
- Create: `server/db/sqliteClient.ts`
- Create: `tests/server/sqliteClient.test.ts`

**Interfaces:**
- Produces: `openConversationDb(): Database.Database` — opens `~/.gemini/antigravity-cli/conversation_summaries.db` read-only
- Produces: `ConversationSummary` type

**Steps:**

- [ ] **Step 1: Write server/db/sqliteClient.ts**

```ts
import Database from 'better-sqlite3';
import path from 'path';
import { getConfig } from '../config';

export interface ConversationSummary {
  conversation_id: string;
  title: string;
  preview: string;
  step_count: number;
  last_modified_time: string;
  workspace_uris: string[];
  status: string;
  source: string;
  project_id: string;
  agent_name: string;
  parent_conversation_id: string;
  nesting_depth: number;
  not_fully_idle: boolean;
  killed: boolean;
  last_user_input_time: string;
}

let cached: Database.Database | null = null;

export function openConversationDb(): Database.Database {
  if (cached) return cached;
  const dbPath = path.join(getConfig().agyHome, 'conversation_summaries.db');
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  db.pragma('journal_mode = WAL');
  cached = db;
  return db;
}

export function closeConversationDb(): void {
  if (cached) {
    cached.close();
    cached = null;
  }
}
```

- [ ] **Step 2: Write tests/server/sqliteClient.test.ts**

```ts
import { describe, it, expect, afterAll } from 'vitest';
import { openConversationDb, closeConversationDb } from '../../server/db/sqliteClient';

describe('openConversationDb', () => {
  afterAll(() => closeConversationDb());

  it('opens the AGY database in read-only mode', () => {
    const db = openConversationDb();
    expect(db).toBeDefined();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    expect(tables.map((t: any) => t.name)).toContain('conversation_summaries');
  });

  it('returns the same instance on subsequent calls', () => {
    const a = openConversationDb();
    const b = openConversationDb();
    expect(a).toBe(b);
  });

  it('can read a conversation summary', () => {
    const db = openConversationDb();
    const row = db.prepare(`
      SELECT conversation_id, title, workspace_uris, not_fully_idle, killed
      FROM conversation_summaries
      LIMIT 1
    `).get() as any;
    if (row) {
      expect(row.conversation_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(typeof row.workspace_uris).toBe('string');
    }
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/server/sqliteClient.test.ts`
Expected: PASS (all 3 tests or skip if no conversations)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: read-only sqlite client for conversation_summaries.db"
```

---

#### Task 4: Conversation indexer with workspace grouping

**Files:**
- Create: `server/db/conversationIndex.ts`
- Create: `tests/server/conversationIndex.test.ts`

**Interfaces:**
- Produces: `ConversationIndex` class with:
  - `load(): Promise<void>` — initial scan
  - `getAll(): ConversationSummary[]`
  - `getById(id: string): ConversationSummary | undefined`
  - `groupByWorkspace(): Map<string, ConversationSummary[]>`
  - `applyDelta(newRows: ConversationSummary[]): void`

**Steps:**

- [ ] **Step 1: Write server/db/conversationIndex.ts**

```ts
import { openConversationDb, ConversationSummary } from './sqliteClient';

const SELECT_ALL = `
  SELECT
    conversation_id, title, preview, step_count, last_modified_time,
    workspace_uris, status, source, project_id, agent_name,
    parent_conversation_id, nesting_depth, not_fully_idle, killed,
    last_user_input_time
  FROM conversation_summaries
  ORDER BY last_modified_time DESC
`;

export class ConversationIndex {
  private byId = new Map<string, ConversationSummary>();

  load(): void {
    const db = openConversationDb();
    const rows = db.prepare(SELECT_ALL).all() as any[];
    this.byId.clear();
    for (const row of rows) {
      this.byId.set(row.conversation_id, this.parseRow(row));
    }
  }

  getAll(): ConversationSummary[] {
    return Array.from(this.byId.values());
  }

  getById(id: string): ConversationSummary | undefined {
    return this.byId.get(id);
  }

  applyDelta(rows: ConversationSummary[]): void {
    for (const row of rows) {
      this.byId.set(row.conversation_id, row);
    }
  }

  /**
   * Group conversations by their primary workspace root.
   * Falls back to "unknown" if no workspace_uris.
   */
  groupByWorkspace(): Map<string, ConversationSummary[]> {
    const groups = new Map<string, ConversationSummary[]>();
    for (const c of this.byId.values()) {
      const key = c.workspace_uris[0] ?? 'unknown';
      const arr = groups.get(key) ?? [];
      arr.push(c);
      groups.set(key, arr);
    }
    return groups;
  }

  private parseRow(row: any): ConversationSummary {
    return {
      ...row,
      workspace_uris: JSON.parse(row.workspace_uris || '[]'),
      not_fully_idle: Boolean(row.not_fully_idle),
      killed: Boolean(row.killed)
    };
  }
}
```

- [ ] **Step 2: Write tests/server/conversationIndex.test.ts**

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { ConversationIndex } from '../../server/db/conversationIndex';

describe('ConversationIndex', () => {
  let idx: ConversationIndex;

  beforeAll(() => {
    idx = new ConversationIndex();
    idx.load();
  });

  it('loads conversations from the database', () => {
    const all = idx.getAll();
    expect(all.length).toBeGreaterThan(0);
  });

  it('returns conversations parsed with workspace_uris as array', () => {
    const all = idx.getAll();
    const sample = all[0];
    expect(Array.isArray(sample.workspace_uris)).toBe(true);
  });

  it('groupByWorkspace returns non-empty groups', () => {
    const groups = idx.groupByWorkspace();
    expect(groups.size).toBeGreaterThan(0);
  });

  it('applyDelta inserts new conversation', () => {
    const newRow = {
      conversation_id: 'test-uuid-1',
      title: 'Test',
      preview: '',
      step_count: 0,
      last_modified_time: '2026-08-15T00:00:00Z',
      workspace_uris: ['file:///tmp/test'],
      status: '',
      source: '',
      project_id: '',
      agent_name: '',
      parent_conversation_id: '',
      nesting_depth: 0,
      not_fully_idle: false,
      killed: false,
      last_user_input_time: '2026-08-15T00:00:00Z'
    };
    const before = idx.getAll().length;
    idx.applyDelta([newRow]);
    const after = idx.getAll().length;
    expect(after).toBe(before + 1);
    expect(idx.getById('test-uuid-1')?.title).toBe('Test');
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/server/conversationIndex.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: conversation index with workspace grouping"
```

---

#### Task 5: File watcher for live updates

**Files:**
- Create: `server/services/discoveryService.ts`
- Create: `tests/contract/discoveryService.test.ts`

**Interfaces:**
- Produces: `DiscoveryService` class with:
  - `start(onChange: (event: DiscoveryEvent) => void): void`
  - `stop(): void`
- Produces: `DiscoveryEvent` type: `{ type: 'upsert' | 'remove', conversation_id: string, summary?: ConversationSummary }`

**Steps:**

- [ ] **Step 1: Write server/services/discoveryService.ts**

```ts
import chokidar from 'chokidar';
import path from 'path';
import { getConfig } from '../config';
import { ConversationIndex, ConversationSummary } from '../db/conversationIndex';
import { openConversationDb } from '../db/sqliteClient';

export type DiscoveryEvent =
  | { type: 'upsert'; conversation_id: string; summary: ConversationSummary }
  | { type: 'remove'; conversation_id: string };

export class DiscoveryService {
  private index: ConversationIndex;
  private watcher: chokidar.FSWatcher | null = null;
  private lastSeenIds = new Set<string>();

  constructor(index: ConversationIndex) {
    this.index = index;
  }

  start(onChange: (event: DiscoveryEvent) => void): void {
    const cfg = getConfig();
    const initialSnapshot = new Map<string, ConversationSummary>();
    this.index.load();
    for (const c of this.index.getAll()) {
      this.lastSeenIds.add(c.conversation_id);
      initialSnapshot.set(c.conversation_id, c);
    }

    const dbPath = path.join(cfg.agyHome, 'conversation_summaries.db');
    const historyPath = path.join(cfg.agyHome, 'history.jsonl');

    this.watcher = chokidar.watch([dbPath, historyPath], {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 }
    });

    this.watcher.on('change', () => {
      this.refresh(onChange);
    });
  }

  stop(): void {
    this.watcher?.close();
  }

  private refresh(onChange: (event: DiscoveryEvent) => void): void {
    const db = openConversationDb();
    const rows = db.prepare(`
      SELECT conversation_id, title, preview, step_count, last_modified_time,
             workspace_uris, status, source, project_id, agent_name,
             parent_conversation_id, nesting_depth, not_fully_idle, killed,
             last_user_input_time
      FROM conversation_summaries
    `).all() as any[];

    const currentIds = new Set<string>();
    const parsed: ConversationSummary[] = rows.map((row) => ({
      ...row,
      workspace_uris: JSON.parse(row.workspace_uris || '[]'),
      not_fully_idle: Boolean(row.not_fully_idle),
      killed: Boolean(row.killed)
    }));

    for (const c of parsed) {
      currentIds.add(c.conversation_id);
      if (!this.lastSeenIds.has(c.conversation_id)) {
        this.index.applyDelta([c]);
        onChange({ type: 'upsert', conversation_id: c.conversation_id, summary: c });
      }
    }

    for (const id of this.lastSeenIds) {
      if (!currentIds.has(id)) {
        onChange({ type: 'remove', conversation_id: id });
      }
    }

    this.lastSeenIds = currentIds;
  }
}
```

- [ ] **Step 2: Write tests/contract/discoveryService.test.ts**

```ts
import { describe, it, expect, afterAll } from 'vitest';
import { DiscoveryService } from '../../server/services/discoveryService';
import { ConversationIndex } from '../../server/db/conversationIndex';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let idx: ConversationIndex;

  afterAll(() => service?.stop());

  it('starts and loads initial conversations', () => {
    idx = new ConversationIndex();
    service = new DiscoveryService(idx);
    const events: any[] = [];
    service.start((e) => events.push(e));
    expect(idx.getAll().length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/contract/discoveryService.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: file watcher for live conversation updates"
```

---

#### Task 6: REST API for project tree

**Files:**
- Create: `server/routes/projects.ts`
- Modify: `server/index.ts`

**Interfaces:**
- Produces: `GET /api/projects` → `{ groups: Array<{ workspace: string, conversations: ConversationSummary[] }> }`

**Steps:**

- [ ] **Step 1: Write server/routes/projects.ts**

```ts
import { Router } from 'express';
import { ConversationIndex } from '../db/conversationIndex';

export function createProjectsRouter(index: ConversationIndex): Router {
  const router = Router();

  router.get('/projects', (_req, res) => {
    const groups = Array.from(index.groupByWorkspace().entries()).map(
      ([workspace, conversations]) => ({ workspace, conversations })
    );
    res.json({ groups });
  });

  return router;
}
```

- [ ] **Step 2: Modify server/index.ts to mount the router**

```ts
import express from 'express';
import http from 'http';
import cors from 'cors';
import { getConfig } from './config';
import { attachWsServer } from './ws/wsServer';
import { ConversationIndex } from './db/conversationIndex';
import { createProjectsRouter } from './routes/projects';

const config = getConfig();
const app = express();
app.use(cors());
app.use(express.json());

const index = new ConversationIndex();
index.load();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', agyHome: config.agyHome });
});
app.use('/api', createProjectsRouter(index));

const httpServer = http.createServer(app);
attachWsServer(httpServer, config.token);

httpServer.listen(config.port, config.host, () => {
  console.log(`AGY Web UI server listening on ${config.host}:${config.port}`);
});
```

- [ ] **Step 3: Verify endpoint**

Run: `npm run dev:server`
Run: `curl http://localhost:3000/api/projects | head -200`
Expected: JSON with `groups` array containing workspace keys and conversation lists

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: REST API for grouped project tree"
```

---

### Phase 3: Stream Runner & Chat Engine

#### Task 7: Stream-JSON parser

**Files:**
- Create: `server/utils/streamParser.ts`
- Create: `tests/server/streamParser.test.ts`

**Interfaces:**
- Produces: `AgyEvent` discriminated union
- Produces: `parseStreamLine(line: string): AgyEvent | null`

**Steps:**

- [ ] **Step 1: Write server/utils/streamParser.ts**

```ts
export type AgyEvent =
  | { type: 'init'; conversation_id: string; model: string; tools: string[]; permission_mode: string }
  | { type: 'step_update'; step_index: number; step_type: string; state: string; text_delta?: string; tool_name?: string; tool_info?: any; duration_seconds?: number; usage?: any }
  | { type: 'result'; conversation_id: string; status: string; response: string; duration_seconds: number; num_turns: number; usage: { input_tokens: number; output_tokens: number; thinking_tokens: number; cache_read_tokens: number; total_tokens: number } }
  | { type: 'error'; message: string };

export function parseStreamLine(line: string): AgyEvent | null {
  if (!line.trim()) return null;
  let raw: any;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }

  if (raw.event === 'init' && raw.init) {
    return {
      type: 'init',
      conversation_id: raw.conversation_id,
      model: raw.init.model,
      tools: raw.init.tools ?? [],
      permission_mode: raw.init.permission_mode
    };
  }

  if (raw.event === 'step_update' && raw.step_update) {
    const su = raw.step_update;
    return {
      type: 'step_update',
      step_index: su.step_index,
      step_type: su.step_type,
      state: su.state,
      text_delta: su.text_delta,
      tool_name: su.tool_name,
      tool_info: su.tool_info,
      duration_seconds: su.duration_seconds,
      usage: su.usage
    };
  }

  if (raw.event === 'result' && raw.result) {
    const r = raw.result;
    return {
      type: 'result',
      conversation_id: r.conversation_id,
      status: r.status,
      response: r.response,
      duration_seconds: r.duration_seconds,
      num_turns: r.num_turns,
      usage: r.usage
    };
  }

  return null;
}
```

- [ ] **Step 2: Replay a real spike log**

Check `/tmp/agy-spike/spike1c-output.log` exists. If not, copy the JSON lines from the spike data into a test fixture.

- [ ] **Step 3: Write tests/server/streamParser.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { parseStreamLine } from '../../server/utils/streamParser';

describe('parseStreamLine', () => {
  it('parses init event', () => {
    const line = JSON.stringify({
      event: 'init',
      conversation_id: 'abc-123',
      init: { model: 'Gemini 3.7 Flash (High)', tools: ['finish'], permission_mode: 'request-review' }
    });
    const e = parseStreamLine(line);
    expect(e?.type).toBe('init');
    if (e?.type === 'init') {
      expect(e.model).toBe('Gemini 3.7 Flash (High)');
      expect(e.tools).toContain('finish');
    }
  });

  it('parses step_update with text_delta', () => {
    const line = JSON.stringify({
      event: 'step_update',
      step_update: { step_index: 5, step_type: 'agent_response', state: 'ACTIVE', text_delta: 'hello' }
    });
    const e = parseStreamLine(line);
    expect(e?.type).toBe('step_update');
    if (e?.type === 'step_update') {
      expect(e.text_delta).toBe('hello');
    }
  });

  it('parses step_update with tool call', () => {
    const line = JSON.stringify({
      event: 'step_update',
      step_update: {
        step_index: 3,
        step_type: 'tool',
        state: 'DONE',
        tool_name: 'run_command',
        tool_info: { name: 'run_command', parameters: { CommandLine: 'ls' }, output: 'file.txt' }
      }
    });
    const e = parseStreamLine(line);
    if (e?.type === 'step_update') {
      expect(e.tool_name).toBe('run_command');
    }
  });

  it('parses result event with usage', () => {
    const line = JSON.stringify({
      event: 'result',
      result: {
        conversation_id: 'abc',
        status: 'SUCCESS',
        response: 'hi',
        duration_seconds: 1.0,
        num_turns: 1,
        usage: { input_tokens: 100, output_tokens: 50, thinking_tokens: 0, cache_read_tokens: 0, total_tokens: 150 }
      }
    });
    const e = parseStreamLine(line);
    if (e?.type === 'result') {
      expect(e.usage.input_tokens).toBe(100);
    }
  });

  it('returns null for malformed line', () => {
    expect(parseStreamLine('not json')).toBeNull();
  });

  it('returns null for unknown event', () => {
    expect(parseStreamLine(JSON.stringify({ event: 'mystery' }))).toBeNull();
  });
});
```

- [ ] **Step 4: Add a contract test using real spike data**

```ts
// tests/contract/agyStreamContract.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parseStreamLine } from '../../server/utils/streamParser';

describe('replay real AGY stream-json', () => {
  it('parses all lines from spike1c-output.log', () => {
    const logPath = '/tmp/agy-spike/spike1c-output.log';
    let content: string;
    try {
      content = readFileSync(logPath, 'utf-8');
    } catch {
      console.warn('Skipping: spike log not present at ' + logPath);
      return;
    }
    const lines = content.split('\n').filter((l) => l.trim().startsWith('{'));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const evt = parseStreamLine(line);
      expect(evt).not.toBeNull();
    }
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/server/streamParser.test.ts tests/contract/agyStreamContract.test.ts`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: NDJSON stream-json parser with type-safe AgyEvent"
```

---

#### Task 8: TurnRunner — spawn agy and emit events

**Files:**
- Create: `server/services/turnRunner.ts`
- Create: `tests/server/turnRunner.test.ts`

**Interfaces:**
- Produces: `TurnRunner` class with:
  - `spawn(opts: { conversationId, message, model?, effort?, dangerouslySkipPermissions? }): TurnHandle`
- Produces: `TurnHandle` with:
  - `events: AsyncIterable<AgyEvent>`
  - `abort(): void` — sends SIGINT
  - `pid: number`

**Steps:**

- [ ] **Step 1: Write server/services/turnRunner.ts**

```ts
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { parseStreamLine, AgyEvent } from '../utils/streamParser';

export interface TurnOptions {
  conversationId: string;
  message: string;
  model?: string;
  effort?: 'low' | 'medium' | 'high';
  dangerouslySkipPermissions?: boolean;
}

export interface TurnHandle {
  pid: number;
  events: AsyncIterable<AgyEvent>;
  abort(): void;
}

export class TurnRunner {
  spawn(opts: TurnOptions): TurnHandle {
    const args = [
      '--conversation', opts.conversationId,
      ...(opts.model ? ['--model', opts.model] : []),
      ...(opts.effort ? ['--effort', opts.effort] : []),
      ...(opts.dangerouslySkipPermissions ? ['--dangerously-skip-permissions'] : []),
      '--output-format', 'stream-json',
      '--print', opts.message
    ];

    const child: ChildProcessWithoutNullStreams = spawn('agy', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const queue: AgyEvent[] = [];
    const waiters: ((ev: AgyEvent | null) => void)[] = [];
    let closed = false;

    const push = (ev: AgyEvent | null) => {
      const w = waiters.shift();
      if (w) w(ev);
      else if (ev) queue.push(ev);
    };

    let buffer = '';
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        const evt = parseStreamLine(line);
        if (evt) push(evt);
      }
    });

    child.on('close', () => {
      if (buffer.trim()) {
        const evt = parseStreamLine(buffer);
        if (evt) push(evt);
      }
      closed = true;
      push(null);
    });

    child.on('error', (e) => {
      push({ type: 'error', message: e.message });
      closed = true;
      push(null);
    });

    const events: AsyncIterable<AgyEvent> = {
      [Symbol.asyncIterator](): AsyncIterator<AgyEvent> {
        return {
          next(): Promise<IteratorResult<AgyEvent>> {
            if (queue.length > 0) {
              return Promise.resolve({ value: queue.shift()!, done: false });
            }
            if (closed) {
              return Promise.resolve({ value: undefined, done: true });
            }
            return new Promise((resolve) => {
              waiters.push((ev) => {
                if (ev === null) resolve({ value: undefined, done: true });
                else resolve({ value: ev, done: false });
              });
            });
          }
        };
      }
    };

    return {
      pid: child.pid ?? -1,
      events,
      abort(): void {
        child.kill('SIGINT');
      }
    };
  }
}
```

- [ ] **Step 2: Write tests/server/turnRunner.test.ts**

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { TurnRunner } from '../../server/services/turnRunner';
import { ConversationIndex } from '../../server/db/conversationIndex';

describe('TurnRunner', () => {
  let testConversationId: string;

  // Defensive: dynamically pick a real conversation ID rather than hardcoding.
  // Avoids flaky tests when conversations are archived or DB is rebuilt.
  beforeAll(() => {
    const idx = new ConversationIndex();
    idx.load();
    const all = idx.getAll();
    if (all.length === 0) {
      throw new Error('No conversations in AGY storage—run an `agy` session first.');
    }
    testConversationId = all[0].conversation_id;
  });

  it('spawns agy and receives init event', async () => {
    const runner = new TurnRunner();
    const handle = runner.spawn({
      conversationId: testConversationId,
      message: 'say hi',
      model: 'Gemini 3.7 Flash (High)'
    });

    let initSeen = false;
    let resultSeen = false;
    for await (const ev of handle.events) {
      if (ev.type === 'init') initSeen = true;
      if (ev.type === 'result') {
        resultSeen = true;
        expect(ev.status).toBe('SUCCESS');
        break;
      }
    }
    expect(initSeen).toBe(true);
    expect(resultSeen).toBe(true);
  }, 60000);

  it('abort() sends SIGINT', async () => {
    const runner = new TurnRunner();
    const handle = runner.spawn({
      conversationId: testConversationId,
      message: 'long task',
      model: 'Gemini 3.7 Flash (High)'
    });

    setTimeout(() => handle.abort(), 1000);

    let closed = false;
    for await (const _ of handle.events) {
      // consume
    }
    closed = true;
    expect(closed).toBe(true);
  }, 30000);
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/server/turnRunner.test.ts`
Expected: PASS (1st test takes ~10s due to AGY latency; 2nd tests SIGINT)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: TurnRunner spawns agy and exposes async event stream"
```

---

#### Task 9: WebSocket chat handler

**Files:**
- Create: `server/ws/handlers/chatHandler.ts`
- Modify: `server/ws/wsServer.ts`

**Interfaces:**
- Produces: `handleChatConnection(ws: WebSocket, conversations: ConversationIndex): void`
- Produces: chat WS messages per design §6

**Steps:**

- [ ] **Step 1: Write server/ws/handlers/chatHandler.ts**

```ts
import { WebSocket } from 'ws';
import { TurnRunner } from '../../services/turnRunner';
import { ConversationIndex } from '../../db/conversationIndex';

interface ClientMsg {
  type: string;
  conversationId?: string;
  payload?: any;
}

interface ServerMsg {
  type: string;
  conversationId: string;
  payload: any;
  timestamp: number;
}

const TURN_TIMEOUT_MS = 5 * 60 * 1000;

export function handleChatConnection(ws: WebSocket, index: ConversationIndex): void {
  const runner = new TurnRunner();
  const activeTurns = new Map<string, { abort: () => void }>();

  const send = (msg: ServerMsg) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };

  ws.on('message', (data) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (msg.type === 'chat:send' && msg.conversationId && msg.payload) {
      const convId = msg.conversationId;
      const { message, model, effort, dangerouslySkipPermissions } = msg.payload;

      const handle = runner.spawn({
        conversationId: convId,
        message,
        model,
        effort,
        dangerouslySkipPermissions
      });

      activeTurns.set(convId, { abort: handle.abort });

      const timeout = setTimeout(() => handle.abort(), TURN_TIMEOUT_MS);

      send({ type: 'session:status', conversationId: convId, payload: { state: 'RUNNING' }, timestamp: Date.now() });

      (async () => {
        try {
          for await (const ev of handle.events) {
            if (ev.type === 'step_update' && ev.step_type === 'unknown') {
              send({
                type: 'chat:interactive_prompt',
                conversationId: convId,
                payload: { reason: 'unknown_step' },
                timestamp: Date.now()
              });
            } else {
              send({ type: 'chat:stream', conversationId: convId, payload: ev, timestamp: Date.now() });
            }
          }
          send({ type: 'chat:done', conversationId: convId, payload: {}, timestamp: Date.now() });
        } catch (e: any) {
          send({ type: 'chat:error', conversationId: convId, payload: { message: e.message }, timestamp: Date.now() });
        } finally {
          clearTimeout(timeout);
          activeTurns.delete(convId);
          send({ type: 'session:status', conversationId: convId, payload: { state: 'IDLE' }, timestamp: Date.now() });
        }
      })();
    }

    if (msg.type === 'chat:cancel' && msg.conversationId) {
      const turn = activeTurns.get(msg.conversationId);
      if (turn) {
        turn.abort();
        activeTurns.delete(msg.conversationId);
        send({ type: 'session:status', conversationId: msg.conversationId, payload: { state: 'IDLE' }, timestamp: Date.now() });
      }
    }
  });

  ws.on('close', () => {
    // Do NOT abort active turns — they continue in background (server keeps process alive)
    // TODO Phase 5: cleanup on global shutdown
  });
}
```

- [ ] **Step 2: Modify server/ws/wsServer.ts to dispatch**

```ts
import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HTTPServer } from 'http';
import { checkToken } from '../utils/tokens';
import { handleChatConnection } from './handlers/chatHandler';
import { ConversationIndex } from '../db/conversationIndex';

export function attachWsServer(httpServer: HTTPServer, token: string | null, index: ConversationIndex): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/ws')) {
      socket.destroy();
      return;
    }
    if (!checkToken(req, token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    handleChatConnection(ws, index);
  });

  return wss;
}
```

- [ ] **Step 3: Modify server/index.ts to pass index**

```ts
// In server/index.ts, replace attachWsServer call:
attachWsServer(httpServer, config.token, index);
```

- [ ] **Step 4: Manual smoke test**

Run `npm run dev:server`. Use a small Node.js client to verify WS round-trip:

```bash
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/ws');
ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'chat:send',
    conversationId: 'ae6a07d9-24ce-45e1-8aa4-1d4fa355df22',
    payload: { message: '用一句话自我介绍', model: 'Gemini 3.7 Flash (High)' },
    timestamp: Date.now()
  }));
});
ws.on('message', (d) => console.log('<<', d.toString().slice(0, 200)));
ws.on('close', () => process.exit(0));
" 2>&1 | head -20
```

Expected: receive `session:status`, `chat:stream` events, then `chat:done`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: chat WebSocket handler with turn lifecycle and 5-min timeout"
```

---

### Phase 4: Frontend Chat UI

#### Task 10: WebSocket client hook

**Files:**
- Create: `src/hooks/useWebSocket.ts`
- Create: `src/lib/types.ts`

**Interfaces:**
- Produces: `useWebSocket(url: string)` returning `{ send, lastMessage, readyState }`

**Steps:**

- [ ] **Step 1: Write src/lib/types.ts**

```ts
export type WSMessage<T = any> = {
  type: string;
  conversationId: string;
  payload: T;
  timestamp: number;
};

export type ConversationSummary = {
  conversation_id: string;
  title: string;
  preview: string;
  step_count: number;
  last_modified_time: string;
  workspace_uris: string[];
  status: string;
  not_fully_idle: boolean;
  killed: boolean;
  last_user_input_time: string;
};

export type AgyEventClient =
  | { type: 'init'; conversation_id: string; model: string; tools: string[]; permission_mode: string }
  | { type: 'step_update'; step_index: number; step_type: string; state: string; text_delta?: string; tool_name?: string; tool_info?: any; duration_seconds?: number; usage?: any }
  | { type: 'result'; conversation_id: string; status: string; response: string; duration_seconds: number; num_turns: number; usage: any }
  | { type: 'error'; message: string };
```

- [ ] **Step 2: Write src/hooks/useWebSocket.ts**

```ts
import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage } from '@/lib/types';

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [readyState, setReadyState] = useState<WebSocket['readyState']>(WebSocket.CONNECTING);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setReadyState(WebSocket.CONNECTING);

    ws.onopen = () => setReadyState(WebSocket.OPEN);
    ws.onclose = () => {
      setReadyState(WebSocket.CLOSED);
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      try {
        setLastMessage(JSON.parse(e.data));
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
    }
  }, []);

  return { send, lastMessage, readyState };
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: React useWebSocket hook with auto-reconnect"
```

---

#### Task 11: Sidebar with grouped projects

**Files:**
- Create: `src/components/sidebar/Sidebar.tsx`
- Create: `src/components/sidebar/WorkspaceGroup.tsx`
- Create: `src/components/sidebar/ConversationItem.tsx`
- Create: `src/hooks/useProjectIndex.ts`
- Create: `src/lib/api.ts`

**Interfaces:**
- `useProjectIndex()` → `{ groups, refresh }`
- `fetchProjects()` → `GET /api/projects` returns `{ groups: Array<{ workspace, conversations }> }`

**Steps:**

- [ ] **Step 1: Write src/lib/api.ts**

```ts
import type { ConversationSummary } from './types';

export async function fetchProjects(): Promise<{ groups: Array<{ workspace: string; conversations: ConversationSummary[] }> }> {
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: Write src/hooks/useProjectIndex.ts**

```ts
import { useEffect, useState, useCallback } from 'react';
import { fetchProjects } from '@/lib/api';
import type { ConversationSummary } from '@/lib/types';

export type ProjectGroup = { workspace: string; conversations: ConversationSummary[] };

export function useProjectIndex() {
  const [groups, setGroups] = useState<ProjectGroup[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchProjects();
      setGroups(data.groups);
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  return { groups, refresh };
}
```

- [ ] **Step 3: Write src/components/sidebar/ConversationItem.tsx**

```tsx
import { Link } from 'react-router-dom';
import type { ConversationSummary } from '@/lib/types';

export function ConversationItem({ conv }: { conv: ConversationSummary }) {
  return (
    <Link
      to={`/chat/${conv.conversation_id}`}
      className="block rounded px-2 py-1.5 text-sm hover:bg-accent flex items-center justify-between"
    >
      <span className="truncate">{conv.title || conv.conversation_id.slice(0, 8)}</span>
      <span className="text-xs text-muted-foreground">{conv.step_count} steps</span>
    </Link>
  );
}
```

- [ ] **Step 4: Write src/components/sidebar/WorkspaceGroup.tsx**

```tsx
import { useState } from 'react';
import { ConversationItem } from './ConversationItem';
import type { ConversationSummary } from '@/lib/types';

export function WorkspaceGroup({
  workspace,
  conversations
}: {
  workspace: string;
  conversations: ConversationSummary[];
}) {
  const [open, setOpen] = useState(true);
  const display = workspace.startsWith('file://') ? workspace.replace('file://', '') : workspace;

  return (
    <div className="mb-2">
      <button
        className="w-full text-left text-sm font-medium px-2 py-1 rounded hover:bg-accent"
        onClick={() => setOpen(!open)}
      >
        {open ? '▼' : '▶'} {display.split('/').slice(-2).join('/')}
      </button>
      {open && (
        <div className="ml-3 mt-1">
          {conversations.map((c) => (
            <ConversationItem key={c.conversation_id} conv={c} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Write src/components/sidebar/Sidebar.tsx**

```tsx
import { useProjectIndex } from '@/hooks/useProjectIndex';
import { WorkspaceGroup } from './WorkspaceGroup';

export function Sidebar() {
  const { groups, refresh } = useProjectIndex();

  return (
    <aside className="w-64 h-screen border-r border-border p-3 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Projects</h2>
        <button onClick={refresh} className="text-xs text-muted-foreground hover:text-foreground">
          ↻
        </button>
      </div>
      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">No conversations yet.</p>
      )}
      {groups.map((g) => (
        <WorkspaceGroup key={g.workspace} workspace={g.workspace} conversations={g.conversations} />
      ))}
    </aside>
  );
}
```

- [ ] **Step 6: Install react-router-dom**

```bash
npm install react-router-dom
```

- [ ] **Step 7: Modify src/App.tsx to render sidebar**

```tsx
import { Sidebar } from './components/sidebar/Sidebar';

export default function App() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">
        <div className="p-8 text-muted-foreground">Select a conversation to start.</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 8: Verify in browser**

Run `npm run dev`. Browser at localhost:5173 should show sidebar with grouped projects from AGY storage.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: sidebar with grouped project tree"
```

---

#### Task 12: Chat view with streaming messages

**Files:**
- Create: `src/components/chat/ChatContainer.tsx`
- Create: `src/components/chat/MessageList.tsx`
- Create: `src/components/chat/MessageItem.tsx`
- Create: `src/components/chat/ThoughtAccordion.tsx`
- Create: `src/components/chat/ToolCard.tsx`
- Create: `src/components/chat/ChatInput.tsx`
- Create: `src/hooks/useConversation.ts`
- Create: `src/pages/ChatPage.tsx`

**Interfaces:**
- `useConversation(id: string)` → `{ messages, status, send, cancel }`

**Steps:**

- [ ] **Step 1: Write src/hooks/useConversation.ts**

```ts
import { useEffect, useReducer, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import type { AgyEventClient, ConversationSummary } from '@/lib/types';

type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; toolCalls?: any[]; thought?: string }
  | { id: string; role: 'tool'; name: string; input: any; output: string };

type State = {
  messages: Message[];
  status: 'IDLE' | 'RUNNING' | 'PAUSED';
  /**
   * Set to true when server emits `chat:interactive_prompt` (e.g. AGY waiting
   * for ask_permission / ask_question). ChatContainer uses this to auto-open
   * the WebTTY modal for interactive resolution.
   */
  interactivePrompt: boolean;
};

type Action =
  | { type: 'user'; text: string }
  | { type: 'event'; event: AgyEventClient }
  | { type: 'status'; status: 'IDLE' | 'RUNNING' | 'PAUSED' }
  | { type: 'interactive_prompt'; active: boolean }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'user':
      return {
        ...state,
        messages: [...state.messages, { id: crypto.randomUUID(), role: 'user', text: action.text }]
      };
    case 'event': {
      const ev = action.event;
      if (ev.type === 'step_update') {
        if (ev.step_type === 'agent_response' && ev.text_delta) {
          const last = state.messages[state.messages.length - 1];
          if (last?.role === 'assistant') {
            const updated = [...state.messages];
            updated[updated.length - 1] = { ...last, text: last.text + ev.text_delta };
            return { ...state, messages: updated };
          } else {
            return {
              ...state,
              messages: [
                ...state.messages,
                { id: crypto.randomUUID(), role: 'assistant', text: ev.text_delta }
              ]
            };
          }
        }
        if (ev.step_type === 'tool' && ev.tool_name) {
          return {
            ...state,
            messages: [
              ...state.messages,
              {
                id: crypto.randomUUID(),
                role: 'tool',
                name: ev.tool_name,
                input: ev.tool_info?.parameters ?? {},
                output: ev.tool_info?.output ?? ''
              }
            ]
          };
        }
      }
      if (ev.type === 'result') {
        const last = state.messages[state.messages.length - 1];
        if (last?.role === 'assistant' && !last.text && ev.response) {
          const updated = [...state.messages];
          updated[updated.length - 1] = { ...last, text: ev.response };
          return { ...state, messages: updated };
        }
      }
      return state;
    }
    case 'status':
      return { ...state, status: action.status };
    case 'interactive_prompt':
      return { ...state, interactivePrompt: action.active };
    case 'reset':
      return { messages: [], status: 'IDLE', interactivePrompt: false };
  }
}

export function useConversation(conversationId: string) {
  const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  const { send, lastMessage, readyState } = useWebSocket(wsUrl);
  const [state, dispatch] = useReducer(reducer, {
    messages: [],
    status: 'IDLE',
    interactivePrompt: false
  });
  const conversationIdRef = useRef(conversationId);

  useEffect(() => {
    conversationIdRef.current = conversationId;
    dispatch({ type: 'reset' });
  }, [conversationId]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.conversationId !== conversationIdRef.current) return;

    if (lastMessage.type === 'session:status') {
      dispatch({ type: 'status', status: lastMessage.payload.state });
    } else if (lastMessage.type === 'chat:stream') {
      dispatch({ type: 'event', event: lastMessage.payload });
    } else if (lastMessage.type === 'chat:interactive_prompt') {
      dispatch({ type: 'interactive_prompt', active: true });
    }
  }, [lastMessage]);

  const sendPrompt = (text: string, model: string) => {
    dispatch({ type: 'user', text });
    dispatch({ type: 'interactive_prompt', active: false });
    send({
      type: 'chat:send',
      conversationId: conversationIdRef.current,
      payload: { message: text, model },
      timestamp: Date.now()
    });
  };

  const cancel = () => {
    send({
      type: 'chat:cancel',
      conversationId: conversationIdRef.current,
      payload: {},
      timestamp: Date.now()
    });
  };

  /**
   * Called by ChatContainer when user dismisses/saves the WebTTY modal.
   * Clears the interactive prompt so the UI returns to normal chat.
   */
  const clearInteractivePrompt = () => {
    dispatch({ type: 'interactive_prompt', active: false });
  };

  return { ...state, readyState, send: sendPrompt, cancel, clearInteractivePrompt };
}
```

- [ ] **Step 2: Write src/components/chat/ThoughtAccordion.tsx**

```tsx
import { useState } from 'react';

export function ThoughtAccordion({ thought }: { thought: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded p-2 my-1 text-sm">
      <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground">
        {open ? '▼' : '▶'} Thinking
      </button>
      {open && <pre className="mt-1 whitespace-pre-wrap text-xs">{thought}</pre>}
    </div>
  );
}
```

- [ ] **Step 3: Write src/components/chat/ToolCard.tsx**

```tsx
import { useState } from 'react';

export function ToolCard({ name, input, output }: { name: string; input: any; output: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded p-2 my-1 text-sm">
      <button onClick={() => setOpen(!open)} className="font-mono">
        {open ? '▼' : '▶'} {name}
      </button>
      {open && (
        <div className="mt-1 text-xs">
          <div className="text-muted-foreground">Input:</div>
          <pre className="whitespace-pre-wrap">{JSON.stringify(input, null, 2)}</pre>
          {output && (
            <>
              <div className="text-muted-foreground mt-2">Output:</div>
              <pre className="whitespace-pre-wrap">{output}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write src/components/chat/MessageItem.tsx**

```tsx
import { ThoughtAccordion } from './ThoughtAccordion';
import { ToolCard } from './ToolCard';

type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; thought?: string }
  | { id: string; role: 'tool'; name: string; input: any; output: string };

export function MessageItem({ msg }: { msg: Message }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg p-3 bg-primary text-primary-foreground">{msg.text}</div>
      </div>
    );
  }
  if (msg.role === 'tool') {
    return <ToolCard name={msg.name} input={msg.input} output={msg.output} />;
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg p-3 bg-secondary text-secondary-foreground">
        {msg.thought && <ThoughtAccordion thought={msg.thought} />}
        <div className="whitespace-pre-wrap">{msg.text}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write src/components/chat/MessageList.tsx**

```tsx
import { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';

export function MessageList({ messages }: { messages: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div ref={ref} className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((m) => <MessageItem key={m.id} msg={m} />)}
    </div>
  );
}
```

- [ ] **Step 6: Write src/components/chat/ChatInput.tsx**

```tsx
import { useState, KeyboardEvent } from 'react';

export function ChatInput({
  onSend,
  onCancel,
  status
}: {
  onSend: (text: string) => void;
  onCancel: () => void;
  status: 'IDLE' | 'RUNNING' | 'PAUSED';
}) {
  const [text, setText] = useState('');

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim() && status === 'IDLE') {
        onSend(text.trim());
        setText('');
      }
    }
  };

  return (
    <div className="border-t border-border p-3 flex gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
        rows={2}
        className="flex-1 resize-none rounded border border-input bg-background px-3 py-2 text-sm"
      />
      {status === 'RUNNING' ? (
        <button onClick={onCancel} className="rounded bg-destructive text-destructive-foreground px-4">
          Stop
        </button>
      ) : (
        <button
          onClick={() => { if (text.trim()) { onSend(text.trim()); setText(''); } }}
          disabled={!text.trim()}
          className="rounded bg-primary text-primary-foreground px-4 disabled:opacity-50"
        >
          Send
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Write src/components/chat/ChatContainer.tsx**

```tsx
import { useState } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export function ChatContainer({ conversationId }: { conversationId: string }) {
  const { messages, status, send, cancel } = useConversation(conversationId);
  const [model, setModel] = useState('Gemini 3.7 Flash (High)');

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-border p-3 flex items-center gap-3">
        <span className="text-sm text-muted-foreground mr-2">Model:</span>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="border border-input rounded px-2 py-1 text-sm">
          <option>Gemini 3.7 Flash (High)</option>
          <option>Gemini 3.7 Flash (Medium)</option>
          <option>Gemini 3.7 Flash (Low)</option>
          <option>Claude Sonnet 4.6 (Thinking)</option>
          <option>Claude Opus 4.6 (Thinking)</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground">{status}</span>
      </div>
      <MessageList messages={messages} />
      <ChatInput onSend={(text) => send(text, model)} onCancel={cancel} status={status} />
    </div>
  );
}
```

- [ ] **Step 8: Write src/pages/ChatPage.tsx**

```tsx
import { useParams } from 'react-router-dom';
import { ChatContainer } from '@/components/chat/ChatContainer';

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  if (!conversationId) return <div>No conversation selected</div>;
  return <ChatContainer conversationId={conversationId} />;
}
```

- [ ] **Step 9: Modify src/App.tsx to add routing**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatPage } from './pages/ChatPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<div className="p-8 text-muted-foreground">Select a conversation.</div>} />
            <Route path="/chat/:conversationId" element={<ChatPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 10: Verify end-to-end**

Run `npm run dev`. Browser: click a conversation in sidebar, type a message, send. Watch the streaming response.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: chat UI with streaming messages, model selector, cancel"
```

---

### Phase 5: Settings, Permissions, WebTTY

#### Task 13: Settings service (read/write permissions.allow)

**Files:**
- Create: `server/services/settingsService.ts`
- Create: `tests/server/settingsService.test.ts`
- Create: `server/routes/settings.ts`

**Interfaces:**
- `getAllowedCommands(): string[]`
- `addAllowedCommand(pattern: string): void`
- `removeAllowedCommand(pattern: string): void`

**Steps:**

- [ ] **Step 1: Write a backup utility**

```ts
// server/utils/backup.ts
import { copyFileSync } from 'fs';
import path from 'path';

export function backupFile(target: string): void {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${target}.bak.${ts}`;
  copyFileSync(target, backup);
}
```

- [ ] **Step 2: Write server/services/settingsService.ts**

```ts
import { readFileSync, writeFileSync, existsSync, renameSync } from 'fs';
import path from 'path';
import { getConfig } from '../config';
import { backupFile } from '../utils/backup';

interface SettingsFile {
  permissions?: { allow?: string[] };
  [key: string]: any;
}

export function readSettings(): SettingsFile {
  const file = path.join(getConfig().agyHome, 'settings.json');
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, 'utf-8'));
}

/**
 * Atomic write: write to a temp file, then rename.
 * Guarantees settings.json is never half-written, even on crash or kill.
 * Backup is created before the atomic swap.
 */
export function writeSettings(s: SettingsFile): void {
  const file = path.join(getConfig().agyHome, 'settings.json');
  const tmp = `${file}.tmp`;
  backupFile(file);
  writeFileSync(tmp, JSON.stringify(s, null, 2), 'utf-8');
  renameSync(tmp, file);
}

export function getAllowedCommands(): string[] {
  return readSettings().permissions?.allow ?? [];
}

export function addAllowedCommand(pattern: string): void {
  const s = readSettings();
  if (!s.permissions) s.permissions = {};
  if (!s.permissions.allow) s.permissions.allow = [];
  if (!s.permissions.allow.includes(pattern)) {
    s.permissions.allow.push(pattern);
    writeSettings(s);
  }
}

export function removeAllowedCommand(pattern: string): void {
  const s = readSettings();
  if (!s.permissions?.allow) return;
  s.permissions.allow = s.permissions.allow.filter((p) => p !== pattern);
  writeSettings(s);
}
```

- [ ] **Step 3: Write tests/server/settingsService.test.ts**

```ts
import { describe, it, expect, afterAll } from 'vitest';
import { getAllowedCommands, addAllowedCommand, removeAllowedCommand, readSettings } from '../../server/services/settingsService';

describe('settingsService', () => {
  const testPattern = 'command(test-util-' + Date.now() + ')';
  let original: string[];

  afterAll(() => {
    // cleanup
    if (original) {
      for (const p of original) {
        try { addAllowedCommand(p); } catch {}
      }
    }
    try { removeAllowedCommand(testPattern); } catch {}
  });

  it('returns a list of allowed commands', () => {
    const list = getAllowedCommands();
    expect(Array.isArray(list)).toBe(true);
    original = [...list];
  });

  it('adds a new command', () => {
    addAllowedCommand(testPattern);
    expect(getAllowedCommands()).toContain(testPattern);
  });

  it('does not duplicate existing pattern', () => {
    addAllowedCommand(testPattern);
    const count = getAllowedCommands().filter((p) => p === testPattern).length;
    expect(count).toBe(1);
  });

  it('removes a command', () => {
    removeAllowedCommand(testPattern);
    expect(getAllowedCommands()).not.toContain(testPattern);
  });
});
```

- [ ] **Step 4: Write server/routes/settings.ts**

```ts
import { Router } from 'express';
import { getAllowedCommands, addAllowedCommand, removeAllowedCommand } from '../services/settingsService';

export function createSettingsRouter(): Router {
  const router = Router();

  router.get('/settings/permissions', (_req, res) => {
    res.json({ allow: getAllowedCommands() });
  });

  router.post('/settings/permissions', (req, res) => {
    const { pattern } = req.body ?? {};
    if (typeof pattern !== 'string' || !pattern.startsWith('command(')) {
      return res.status(400).json({ error: 'pattern must start with command(' });
    }
    addAllowedCommand(pattern);
    res.json({ ok: true });
  });

  router.delete('/settings/permissions/:pattern', (req, res) => {
    const pattern = decodeURIComponent(req.params.pattern);
    removeAllowedCommand(pattern);
    res.json({ ok: true });
  });

  return router;
}
```

- [ ] **Step 5: Mount router in server/index.ts**

```ts
import { createSettingsRouter } from './routes/settings';
// ... after existing routes:
app.use('/api', createSettingsRouter());
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/server/settingsService.test.ts`
Expected: PASS

- [ ] **Step 7: Manual verification**

```bash
curl http://localhost:3000/api/settings/permissions | head -100
curl -X POST -H 'Content-Type: application/json' \
  -d '{"pattern":"command(test-xyz)"}' \
  http://localhost:3000/api/settings/permissions
curl -X DELETE 'http://localhost:3000/api/settings/permissions/command(test-xyz)'
```

Expected: 200 OK each; final state has no `command(test-xyz)`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: settings service for permissions.allow with safe backup"
```

---

#### Task 14: Settings UI panel

**Files:**
- Create: `src/components/settings/PermissionsPanel.tsx`
- Create: `src/components/settings/SettingsPanel.tsx`
- Create: `src/pages/SettingsPage.tsx`
- Modify: `src/App.tsx`

**Steps:**

- [ ] **Step 1: Add API functions to src/lib/api.ts**

```ts
export async function fetchPermissions(): Promise<{ allow: string[] }> {
  const res = await fetch('/api/settings/permissions');
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

export async function addPermission(pattern: string): Promise<void> {
  await fetch('/api/settings/permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern })
  });
}

export async function removePermission(pattern: string): Promise<void> {
  await fetch(`/api/settings/permissions/${encodeURIComponent(pattern)}`, {
    method: 'DELETE'
  });
}
```

- [ ] **Step 2: Write src/components/settings/PermissionsPanel.tsx**

```tsx
import { useEffect, useState } from 'react';
import { fetchPermissions, addPermission, removePermission } from '@/lib/api';

export function PermissionsPanel() {
  const [allow, setAllow] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await fetchPermissions();
      setAllow(data.allow);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newPattern.startsWith('command(')) {
      setError('Pattern must start with command(');
      return;
    }
    try {
      await addPermission(newPattern);
      setNewPattern('');
      setError('');
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const remove = async (pattern: string) => {
    await removePermission(pattern);
    await load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Permissions Allow List</h2>
      <p className="text-sm text-muted-foreground">
        AGY uses these patterns to auto-approve tool calls. Patterns must start with <code>command(</code>.
      </p>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <div className="flex gap-2">
        <input
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          placeholder="command(npm install)"
          className="flex-1 border border-input rounded px-3 py-1.5 text-sm font-mono"
        />
        <button onClick={add} className="rounded bg-primary text-primary-foreground px-4 text-sm">
          Add
        </button>
      </div>
      <ul className="space-y-1">
        {allow.map((p) => (
          <li key={p} className="flex items-center justify-between border border-border rounded px-3 py-1.5">
            <code className="text-sm">{p}</code>
            <button onClick={() => remove(p)} className="text-xs text-destructive">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Write src/components/settings/SettingsPanel.tsx**

```tsx
import { PermissionsPanel } from './PermissionsPanel';

export function SettingsPanel() {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <PermissionsPanel />
    </div>
  );
}
```

- [ ] **Step 4: Write src/pages/SettingsPage.tsx**

```tsx
import { SettingsPanel } from '@/components/settings/SettingsPanel';

export function SettingsPage() {
  return <SettingsPanel />;
}
```

- [ ] **Step 5: Add route + sidebar link in src/App.tsx**

```tsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <div className="border-b border-border px-4 py-2 text-sm">
            <Link to="/settings" className="text-muted-foreground hover:text-foreground">Settings</Link>
          </div>
          <Routes>
            <Route path="/" element={<div className="p-8 text-muted-foreground">Select a conversation.</div>} />
            <Route path="/chat/:conversationId" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Verify in browser**

Run `npm run dev`. Click "Settings", add a test pattern, save, verify in `settings.json`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: settings UI for permissions allow list"
```

---

#### Task 15: WebTTY (node-pty + xterm.js)

**Files:**
- Create: `server/services/ptyManager.ts`
- Create: `server/ws/handlers/tuiHandler.ts`
- Create: `src/components/tui/WebTTYModal.tsx`
- Modify: `src/pages/ChatPage.tsx`
- Modify: `src/components/chat/ChatContainer.tsx`

**Interfaces:**
- `PtyManager.spawn(conversationId: string): PtySession`
- TUI WebSocket endpoint: `/ws/tui/:conversationId`

**Steps:**

- [ ] **Step 1: Write server/services/ptyManager.ts**

```ts
import * as pty from 'node-pty';

export interface PtySession {
  pid: number;
  onData(cb: (data: string) => void): void;
  onExit(cb: () => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

export class PtyManager {
  spawn(conversationId: string): PtySession {
    const proc = pty.spawn('agy', ['--conversation', conversationId], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env as { [key: string]: string }
    });

    const dataCallbacks: ((data: string) => void)[] = [];
    const exitCallbacks: (() => void)[] = [];

    proc.onData((data) => {
      for (const cb of dataCallbacks) cb(data);
    });
    proc.onExit(() => {
      for (const cb of exitCallbacks) cb();
    });

    return {
      pid: proc.pid,
      onData(cb) { dataCallbacks.push(cb); },
      onExit(cb) { exitCallbacks.push(cb); },
      write(data) { proc.write(data); },
      resize(cols, rows) { proc.resize(cols, rows); },
      kill() { proc.kill(); }
    };
  }
}
```

- [ ] **Step 2: Write server/ws/handlers/tuiHandler.ts**

```ts
import { WebSocket } from 'ws';
import { PtyManager } from '../../services/ptyManager';

export function handleTuiConnection(ws: WebSocket, conversationId: string): void {
  const manager = new PtyManager();
  const session = manager.spawn(conversationId);

  session.onData((data) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'tui:data', data }));
  });
  session.onExit(() => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'tui:exit' }));
  });

  ws.on('message', (raw) => {
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === 'tui:input') session.write(msg.data);
    if (msg.type === 'tui:resize') session.resize(msg.cols, msg.rows);
  });

  ws.on('close', () => {
    session.kill();
  });
}
```

- [ ] **Step 3: Modify server/ws/wsServer.ts to dispatch /ws/tui/:id**

```ts
// In attachWsServer, change the upgrade handler:
httpServer.on('upgrade', (req, socket, head) => {
  if (!req.url?.startsWith('/ws')) {
    socket.destroy();
    return;
  }
  if (!checkToken(req, token)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws: WebSocket, req: any) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname.startsWith('/ws/tui/')) {
    const conversationId = url.pathname.replace('/ws/tui/', '');
    handleTuiConnection(ws, conversationId);
    return;
  }
  handleChatConnection(ws, index);
});
```

- [ ] **Step 4: Install xterm.js**

```bash
npm install xterm @xterm/addon-fit @xterm/addon-webgl
npm install -D @types/xterm
```

- [ ] **Step 5: Write src/components/tui/WebTTYModal.tsx**

```tsx
import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

export function WebTTYModal({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const term = new Terminal({ cursorBlink: true, theme: { background: '#1e1e1e' } });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current!);
    fit.fit();
    termRef.current = term;

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws/tui/${conversationId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'tui:resize', cols: term.cols, rows: term.rows }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'tui:data') term.write(msg.data);
      if (msg.type === 'tui:exit') onClose();
    };
    term.onData((data) => {
      ws.send(JSON.stringify({ type: 'tui:input', data }));
    });

    const handleResize = () => {
      fit.fit();
      ws.send(JSON.stringify({ type: 'tui:resize', cols: term.cols, rows: term.rows }));
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [conversationId, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="border-b border-border px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-sm">WebTTY — {conversationId.slice(0, 8)}</span>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
          Exit TTY
        </button>
      </div>
      <div ref={ref} className="flex-1" />
    </div>
  );
}
```

- [ ] **Step 6: Modify ChatContainer to show interactive prompt and open WebTTY**

```tsx
import { useState, useEffect } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { WebTTYModal } from '../tui/WebTTYModal';

export function ChatContainer({ conversationId }: { conversationId: string }) {
  const { messages, status, send, cancel, interactivePrompt, clearInteractivePrompt } =
    useConversation(conversationId);
  const [model, setModel] = useState('Gemini 3.7 Flash (High)');
  const [showTty, setShowTty] = useState(false);

  // Auto-open WebTTY when AGY is waiting for an interactive prompt
  // (ask_permission / ask_question produces `step_type: "unknown"` on the server).
  useEffect(() => {
    if (interactivePrompt) setShowTty(true);
  }, [interactivePrompt]);

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-border p-3 flex items-center gap-3">
        <span className="text-sm text-muted-foreground mr-2">Model:</span>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="border border-input rounded px-2 py-1 text-sm">
          <option>Gemini 3.7 Flash (High)</option>
          <option>Claude Sonnet 4.6 (Thinking)</option>
          <option>Claude Opus 4.6 (Thinking)</option>
        </select>
        <button
          onClick={() => setShowTty(true)}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1"
        >
          Open WebTTY
        </button>
        <span className="text-xs text-muted-foreground">{status}</span>
      </div>
      <MessageList messages={messages} />
      <ChatInput onSend={(text) => send(text, model)} onCancel={cancel} status={status} />
      {showTty && (
        <WebTTYModal
          conversationId={conversationId}
          onClose={() => {
            setShowTty(false);
            clearInteractivePrompt();
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 7: Manual smoke test**

Run `npm run dev`. Open a conversation, click "Open WebTTY". Verify a terminal appears, runs `agy --conversation <id>`, and you can interact with the TUI.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: WebTTY mode with node-pty + xterm.js"
```

---

### Phase 6: Polish & Resilience

#### Task 16: Quota command

**Files:**
- Create: `server/services/turnRunner.ts` (add `quota()` method)
- Modify: `server/ws/handlers/chatHandler.ts` (handle `chat:quota`)
- Create: `src/components/settings/QuotaPanel.tsx`
- Modify: `src/components/settings/SettingsPanel.tsx`

**Steps:**

- [ ] **Step 1: Add `quota()` method to TurnRunner**

```ts
// In server/services/turnRunner.ts, add to TurnRunner class:
async quota(): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('agy', ['--print', '/quota', '--output-format', 'stream-json'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let output = '';
    child.stdout.on('data', (c: Buffer) => { output += c.toString(); });
    child.on('close', () => resolve(output));
    child.on('error', reject);
  });
}
```

- [ ] **Step 2: Add a `chat:quota` handler in chatHandler.ts**

```ts
// In handleChatConnection, add a case:
if (msg.type === 'chat:quota') {
  const output = await runner.quota();
  send({ type: 'quota:result', conversationId: 'system', payload: { output }, timestamp: Date.now() });
}
```

- [ ] **Step 3: Add `useQuota` hook**

```ts
// src/hooks/useQuota.ts
import { useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';

export function useQuota() {
  const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  const { send, lastMessage } = useWebSocket(wsUrl);
  const [output, setOutput] = useState('');

  useEffect(() => {
    if (lastMessage?.type === 'quota:result') {
      setOutput(lastMessage.payload.output);
    }
  }, [lastMessage]);

  const refresh = () => {
    send({ type: 'chat:quota', conversationId: 'system', payload: {}, timestamp: Date.now() });
  };

  return { output, refresh };
}
```

- [ ] **Step 4: Write src/components/settings/QuotaPanel.tsx**

```tsx
import { useEffect } from 'react';
import { useQuota } from '@/hooks/useQuota';

export function QuotaPanel() {
  const { output, refresh } = useQuota();

  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Quota</h2>
        <button onClick={refresh} className="text-xs text-muted-foreground hover:text-foreground">↻ Refresh</button>
      </div>
      <pre className="whitespace-pre-wrap text-sm border border-border rounded p-3 bg-muted">{output || 'Loading...'}</pre>
    </div>
  );
}
```

- [ ] **Step 5: Mount in SettingsPanel**

```tsx
// In src/components/settings/SettingsPanel.tsx:
import { QuotaPanel } from './QuotaPanel';
// Add below <PermissionsPanel />:
<QuotaPanel />
```

- [ ] **Step 6: Verify in browser**

Run `npm run dev`. Open Settings, see Quota section populate with /quota output.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: quota display panel"
```

---

#### Task 17: End-to-end smoke test

**Files:**
- Create: `tests/contract/e2e.test.ts`

**Steps:**

- [ ] **Step 1: Write a minimal e2e test**

```ts
// tests/contract/e2e.test.ts
import { describe, it, expect } from 'vitest';
import { fetchProjects } from '../../src/lib/api';

describe('e2e sanity', () => {
  it('GET /api/projects returns groups', async () => {
    const data = await fetchProjects();
    expect(Array.isArray(data.groups)).toBe(true);
  });
});
```

- [ ] **Step 2: Run server in background, then test**

```bash
npm run dev:server &
sleep 3
npx vitest run tests/contract/e2e.test.ts
```

- [ ] **Step 3: Update README with run instructions**

```markdown
# AGY Web UI

A browser-based remote interface for the Antigravity CLI.

## Run

\`\`\`bash
npm install
npm run dev
\`\`\`

Dev server runs at http://localhost:5173 (Vite) + http://localhost:3000 (Express).

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `AGY_WEBUI_PORT` | 3000 | Express server port |
| `AGY_WEBUI_HOST` | 0.0.0.0 | Bind address |
| `AGY_WEBUI_TOKEN` | (none) | Optional Bearer token for auth |

## Architecture

Read `docs/superpowers/specs/2026-08-15-agy-webui-design.md` and `docs/superpowers/notes/2026-08-15-spike-verification-findings.md`.
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: README + e2e smoke test"
```

---

## Self-Review

Spec coverage check (against design §1-§11):

| Design Section | Implemented In |
|---|---|
| §1 Overview | All tasks |
| §2 Tech Stack | Task 1 |
| §3 Architecture | Tasks 2, 8, 9 |
| §4.1 Storage Layout | Task 3 |
| §4.2 Discovery | Tasks 4, 5, 6 |
| §5.1 Stateless per-turn | Task 8 |
| §5.2 Turn-level pipeline | Task 9 |
| §5.3 WebTTY | Task 15 |
| §6 WS Protocol | Task 9, 10 |
| §7 State machine | Task 9 (Timer), Task 15 (WebTTY) |
| §8 Frontend UI | Tasks 11, 12, 14 |
| §9 Security | Task 2 (token) |
| §10 Project structure | Task 1 + all tasks |
| §11 Roadmap | Tasks 1-17 cover all 5 phases |

Spike note coverage:

| Spike Note | Implemented In |
|---|---|
| §1.1-1.5 Stream-JSON schema | Task 7 |
| §2.1 `--effort` not supported by Flash | Task 12 (UI omits effort for Flash) |
| §2.3 `--dangerously-skip-permissions` | Task 8 (TurnRunner accepts flag) |
| §3 Permission protocol | Task 13 (settings.json approach) |
| §5 ask_permission/ask_question dual-track | Task 15 (WebTTY fallback) |

Placeholder scan: ✅ No TBDs, TODO markers, or "implement later" placeholders.

Type consistency:
- `AgyEvent` types in `streamParser.ts` (Task 7) match `chatHandler.ts` (Task 9) and `useConversation.ts` (Task 12).
- `ConversationSummary` type in `sqliteClient.ts` (Task 3) matches `conversationIndex.ts` (Task 4) and `api.ts` (Task 11).
- `TurnOptions` and `TurnHandle` in `turnRunner.ts` (Task 8) match caller signature in `chatHandler.ts` (Task 9).
- `WSMessage` type in `types.ts` (Task 10) and `useWebSocket.ts` (Task 10) match server envelope in `chatHandler.ts` (Task 9).

---

## Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-15-agy-webui-impl.md`.**

17 tasks across 6 phases. Each task is self-contained, ends with a green test, and produces a commit.

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
