# AGY Web UI — Technical Architecture & Implementation Design

## 1. Overview

**Project Name:** agy-webui  
**Core Functionality:** A modern, browser-based remote interface for the Antigravity CLI (`agy`), featuring visual project browsing, streaming multi-turn chat interaction, per-turn dynamic model/effort switching, interactive in-browser tool permission approvals, and an on-demand full-screen TUI (WebTTY) fallback.  
**Target Users:** Single-user local or remote workflow (LAN, Tailscale, Cloudflare Tunnel) across mobile and desktop browsers.

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 18 + Vite + shadcn/ui + Tailwind CSS | Rich component ecosystem, responsive layout, fluid Markdown rendering, and fast dev turnaround. |
| **Terminal Canvas** | xterm.js + @xterm/addon-fit + @xterm/addon-webgl | High-performance WebGL terminal renderer for full ANSI/TUI compatibility. |
| **Backend** | Node.js + Express / Fastify + ws (WebSocket) | First-class C++ binding for `node-pty`, streaming I/O, and typed WebSocket routing. |
| **TTY Bridge** | node-pty | Spawns real POSIX pseudo-terminals for interactive `agy` CLI sessions. |
| **Data Discovery & State** | SQLite (`better-sqlite3`) + Chokidar + File System | Reads `conversation_summaries.db` for instant indexing; watches `~/.gemini/antigravity-cli/`. |
| **Execution Engine** | Ephemeral Child Process Runner (`child_process.spawn`) | Runs per-turn temporary processes with bidirectional `stdio` piping for streaming and permission handling. |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser Client (React 18 + shadcn/ui + Tailwind CSS + PWA)             │
│  ├── Sidebar: Grouped Projects & Conversations (from SQLite index)      │
│  ├── Chat Canvas: Streaming Markdown, Tool Cards, Reasoning Traces      │
│  ├── Permission Cards: Inline interactive Approve / Deny UI             │
│  ├── Model Controls: Per-turn Model & Effort Selection Dropdowns       │
│  └── Modal / Page WebTTY: On-demand full-screen xterm.js Terminal       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ WebSocket (Standard JSON Envelope)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  agy-webui Server (Node.js)                                             │
│  ├── Indexing & Discovery Service                                       │
│  │   └── Reads ~/.gemini/antigravity-cli/conversation_summaries.db      │
│  │   └── Reads brain/<id>/ artifacts & history.jsonl                    │
│  ├── Ephemeral Turn Runner (Chat Mode)                                  │
│  │   ├── Spawns: agy --conversation <id> --model <m> --effort <e>       │
│  │   │           --output-format stream-json --print "<msg>"            │
│  │   ├── Stdout Stream Parser: Emits tokens & permission requests       │
│  │   └── Stdin Bridge: Forwards user approvals back to child process    │
│  ├── WebTTY Session Manager (TUI Mode)                                  │
│  │   └── Spawns: node-pty with agy --conversation <id>                  │
│  └── State & Broadcast Hub                                              │
│      └── Manages client connections, active turn queue, and timeouts    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼ (Chat: bidirectional stdio)     ▼ (TUI: pty stream)
┌─────────────────────────────────────────┐ ┌─────────────────────────────┐
│ agy CLI (Per-Turn Ephemeral Process)    │ │ agy CLI (Interactive TUI)   │
│ - Preserves Server Prompt Caching       │ │ - Full interactive fallback │
│ - Interactive permissions via stdin     │ │ - Direct keyboard/screen I/O│
│ - Exits cleanly upon turn completion    │ │ - Managed via node-pty      │
└─────────────────────────────────────────┘ └─────────────────────────────┘
```

---

## 4. Data Storage & Discovery

### 4.1 AGY Storage Layout (Native Data Source)

Projects and conversations are indexed directly from AGY CLI's native directory structure:

```
~/.gemini/antigravity-cli/
├── conversation_summaries.db   → SQLite database storing conversation metadata (id, title, timestamps)
├── history.jsonl               → Full trajectory of conversation events & summaries
├── settings.json               → Global settings, trusted workspaces, permissions
├── brain/<conversation_id>/    → Conversation artifacts, task plans, and system logs
│   ├── task.md                 → Current task description & status
│   ├── implementation_plan.md  → Implementation steps
│   ├── scratch/                → Scratchpad scripts & temporary artifacts
│   └── .system_generated/      → Execution logs & task outputs
└── conversations/              → Raw conversation persistence buffers
```

### 4.2 High-Performance Project Tree Discovery

Instead of recursively scanning deep directories:
1. **Primary Indexing (SQLite)**:
   The backend opens `conversation_summaries.db` in read-only mode to immediately load all conversation headers (`conversation_id`, `title`, `workspace_root`, `updated_at`).
2. **Workspace Grouping**:
   Conversations are grouped by their `workspace_root` (derived from project configurations or `settings.json.trustedWorkspaces`).
3. **Artifact Enrichment**:
   For active conversations, the server inspects `brain/<conversation_id>/` to populate task summaries, active subagent tasks, and plan status.
4. **File Watching**:
   `chokidar` watches `conversation_summaries.db` and `history.jsonl` to push instant incremental sidebar updates over WebSocket.

---

## 5. Execution Engine & Lifecycle Management

The system cleanly delineates between **Session-Level (Cross-Turn)** lifecycle and **Turn-Level (Intra-Turn)** execution.

### 5.1 Session-Level: Stateless Ephemeral Model
* **No Background Zombie Processes**: When the user is idle, reading responses, or formulating prompts, **zero OS processes exist in memory**.
* **Database-Anchored Context**: All conversation context is restored automatically on each turn by passing `--conversation <id>`.
* **Prompt Caching Preservation**: Because `agy` reads previous messages from local storage and constructs an identical, append-only message sequence, cloud LLMs (Gemini / Claude) compute identical prefix hashes. **Prompt Caching / KV-Cache hit rates and cost discounts remain 100% intact.**
* **Dynamic Parameter Injection**: Each turn independently passes the user-selected `--model` and `--effort` flags, allowing instant switching between lightweight and reasoning models mid-conversation.

### 5.2 Turn-Level: Stateful Bidirectional Pipeline & Permission Approvals

During an active turn, the backend launches an ephemeral process with piped I/O:

```typescript
const child = spawn('agy', [
  '--conversation', conversationId,
  '--model', selectedModel,
  '--effort', selectedEffort,
  '--output-format', 'stream-json',
  '--print', userMessage
], {
  stdio: ['pipe', 'pipe', 'pipe'] // stdin, stdout, stderr are all piped
});
```

#### Step-by-Step Execution & Approval Flow:
1. **Prompt Submission**: User clicks Send $\to$ Server transitions conversation state to `RUNNING` $\to$ Spawns child process.
2. **Output Streaming**: Stdout chunks are parsed line-by-line as JSON and forwarded to the Web client over WebSocket.
3. **Permission Interception (`WAITING_FOR_PERMISSION`)**:
   - If the agent calls a tool requiring approval (e.g., executing shell commands or writing outside workspace), `agy` emits a permission request event on stdout and halts execution waiting for stdin.
   - The server transitions the conversation sub-state to `WAITING_FOR_PERMISSION` and pushes a `permission:request` frame to the browser.
   - The browser displays an **Interactive Permission Card** (action details, command line, risk level, and Approve / Deny buttons).
4. **User Resolution**:
   - User clicks **Approve** or **Deny** in the UI.
   - Web client sends `permission:resolve` via WebSocket.
   - Server writes the decision to `child.stdin.write("y\n")` or `child.stdin.write("n\n")`.
   - The child process unblocks and continues streaming output.
5. **Turn Completion**:
   - The agent finishes its response $\to$ `child` process emits final event and exits cleanly with code 0.
   - Server flushes state to `IDLE` and closes stream envelopes.

#### Safety & Timeout Guardrails:
* **Approval Timeout**: If the user leaves the UI or fails to approve within **5 minutes**, the server automatically sends `SIGINT` to the child process, cancels the turn gracefully, and returns the conversation to `IDLE`.
* **Client Disconnect**: If the WebSocket disconnects during `WAITING_FOR_PERMISSION`, the server maintains a 60-second grace window for reconnect before aborting the turn.

### 5.3 TUI Mode: Dedicated WebTTY Session

When full interactive terminal capability is required:
1. User clicks **"Open WebTTY"** in the UI.
2. Server spawns an independent `node-pty` terminal process:
   ```bash
   agy --conversation <conversation_id>
   ```
3. Raw ANSI streams and keystrokes are bridged bidirectionally via `/ws/tui/:conversationId`.
4. Window resizing (`cols`, `rows`) is forwarded via `ptyProcess.resize(cols, rows)`.
5. Upon closing WebTTY, changes are already saved in the local database, allowing the Chat UI to simply refresh and display any newly created turns.

---

## 6. Communication Protocol (WebSocket Envelope)

All WebSocket frames adhere to a typed envelope protocol:

```typescript
interface WSMessage<T = any> {
  type: 
    | 'chat:send'             // Client -> Server: Submit prompt + model/effort
    | 'chat:cancel'           // Client -> Server: Abort active turn (SIGINT)
    | 'chat:stream'           // Server -> Client: Progressive text/thought/tool chunk
    | 'chat:done'             // Server -> Client: Turn execution finished
    | 'chat:error'            // Server -> Client: Execution error
    | 'permission:request'    // Server -> Client: Tool approval required
    | 'permission:resolve'    // Client -> Server: User approval decision
    | 'session:status'        // Server -> Client: Conversation state update
    | 'tree:update';          // Server -> Client: Project/conversation tree update
  conversationId: string;
  payload: T;
  timestamp: number;
}
```

### Permission Payloads:

```typescript
// permission:request payload
interface PermissionRequestPayload {
  requestId: string;
  toolName: string;
  command?: string;
  targetPath?: string;
  description?: string;
  dangerLevel: 'low' | 'medium' | 'high';
}

// permission:resolve payload
interface PermissionResolvePayload {
  requestId: string;
  decision: 'approve' | 'deny' | 'always_allow';
}
```

---

## 7. Dual-Tier State Machine

```
========================= TIER 1: SESSION GLOBAL STATE =========================

                          user clicks "Open WebTTY"
                  ┌───────────────────────────────────────┐
                  ▼                                       │
           ┌──────────────┐                          ┌────────┐
           │ PTY_ATTACHED │                          │  IDLE  │◀──────────────┐
           └──────────────┘                          └────────┘               │
                  │                                       │                   │
                  │ close TTY                             │ user sends prompt │
                  ▼                                       ▼                   │
            (sync from DB)                           ┌─────────┐              │
                  └─────────────────────────────────▶│ RUNNING │──────────────┘
                                                     └─────────┘ turn done / error
                                                          │
                                                          │ (Intra-turn Execution)
                                                          ▼
====================== TIER 2: INTRA-TURN SUB-STATES ======================

   ┌────────────────────┐   stream chunks    ┌───────────────────┐
   │ STREAMING_THOUGHT  │───────────────────▶│  STREAMING_TEXT   │
   └────────────────────┘                    └───────────────────┘
             │                                         │
             │ tool call with approval                 │ tool call with approval
             ▼                                         ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                   WAITING_FOR_PERMISSION                    │
   │  - Child process blocked on stdin                           │
   │  - UI renders Approval Card with Approve / Deny             │
   │  - 5-minute timeout guard / disconnect abort                │
   └─────────────────────────────────────────────────────────────┘
                                  │
                                  │ user resolves (write to stdin)
                                  ▼
                         ┌─────────────────┐
                         │  TOOL_EXECUTING │
                         └─────────────────┘
```

---

## 8. Frontend Interface & Key Components

### 8.1 Layout Structure
* **Left Sidebar**:
  * Workspace group tree (collapsible directories).
  * Conversation list with title, active model badge, and relative last active timestamp.
  * "+ New Session" button (selects target workspace).
* **Main Chat Area**:
  * **Top Bar**: Active workspace path, Conversation title, Dynamic Model Selector dropdown, Effort dropdown (`low`/`medium`/`high`), WebTTY toggle button.
  * **Message Stream**:
    * User bubbles (right-aligned, accent surface).
    * Assistant bubbles with live typing effect and Markdown syntax highlighting.
    * Thought/Reasoning Accordion ("Thinking Process..." collapsible card).
    * Tool Execution Cards (displays tool action, parameters, and collapsible output).
    * **Interactive Permission Card**: Real-time approval modal/card showing command snippet, risk badge, and Approve / Deny actions.
  * **Bottom Input Bar**:
    * Auto-expanding Textarea (Enter to send, Shift+Enter for newline).
    * Stop Generation button (sends SIGINT / SIGTERM to abort active turn).
* **WebTTY Modal / Fullscreen Drawer**:
  * Integrated `xterm.js` terminal window with dark theme styling.
  * Top bar with connection status, terminal resize toggle, and "Exit TTY" button.

---

## 9. Security & Network Considerations

* **Single-User Architecture**: Tailored for personal workflow without multi-tenant overhead.
* **Network Binding**: Binds to `0.0.0.0` or configurable host (`127.0.0.1` for local-only, LAN IP for mobile access).
* **Access Control**: Optional secret token / passphrase authentication via environment variable (`AGY_WEBUI_TOKEN`), verified during HTTP handshake and WebSocket upgrade.
* **Remote Access**: Seamless integration with Tailscale mesh networks and reverse proxies.

---

## 10. Project Directory Structure

```
agy-webui/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── src/
│   ├── main.tsx                         # React entrypoint
│   ├── App.tsx                          # App shell & router
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
│   │   │   ├── PermissionCard.tsx       # Inline interactive approval component
│   │   │   └── ChatInput.tsx
│   │   ├── tui/
│   │   │   └── WebTTYModal.tsx          # xterm.js integration
│   │   └── ui/                          # shadcn/ui primitives
│   ├── hooks/
│   │   ├── useWebSocket.ts              # Resilient WS client with auto-reconnect
│   │   ├── useConversation.ts           # Active conversation state & actions
│   │   └── useProjectIndex.ts           # Workspace/project tree state
│   ├── lib/
│   │   ├── api.ts                       # REST endpoints
│   │   ├── types.ts                     # Shared TypeScript interfaces
│   │   └── utils.ts
│   └── pages/
│       ├── ChatPage.tsx
│       └── SettingsPage.tsx
├── server/
│   ├── index.ts                         # Node.js server entrypoint
│   ├── config.ts                        # Paths and server configuration
│   ├── db/
│   │   └── sqliteClient.ts              # Read-only client for conversation_summaries.db
│   ├── services/
│   │   ├── discoveryService.ts          # Indexes projects, workspaces, and history
│   │   ├── turnRunner.ts                # Ephemeral agy runner with stdio bridge & timeout
│   │   └── ptyManager.ts                # node-pty terminal pool for TUI sessions
│   └── ws/
│       ├── wsServer.ts                  # WebSocket server & connection router
│       └── handlers/
│           ├── chatHandler.ts           # Streaming & permission resolution router
│           └── tuiHandler.ts            # PTY data router
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-08-15-agy-webui-design.md
```

---

## 11. Implementation Roadmap

### Phase 1: Storage Discovery & Server Core
- Implement SQLite read-only indexer for `~/.gemini/antigravity-cli/conversation_summaries.db`.
- Build REST & WebSocket server skeleton with TypeScript.
- Implement project/workspace grouping logic.

### Phase 2: Ephemeral Turn Runner & Stdio Bridge
- Build `turnRunner.ts` to spawn `agy --conversation <id> --print ... --output-format stream-json`.
- Implement bidirectional stdio piping: stdout stream parsing + stdin permission forwarding.
- Implement 5-minute permission approval timeout and SIGINT cancellation support.

### Phase 3: Frontend Chat & Permission UI
- Scaffold React + Vite + Tailwind + shadcn/ui.
- Build Sidebar with instant workspace grouping.
- Implement streaming message view, Markdown formatting, tool call cards, and reasoning trace accordions.
- Build interactive `PermissionCard.tsx` with Approve/Deny buttons.
- Build top bar with dynamic Model and Effort selection dropdowns.

### Phase 4: WebTTY Integration
- Integrate `node-pty` on server and `xterm.js` on frontend.
- Build dedicated PTY WebSocket bridge with automatic resize relay.
- Add full-screen WebTTY modal in the Chat UI.

### Phase 5: Resilience & Polish
- Auto-reconnect with exponential backoff on network drop.
- Optional passphrase authentication token.
- PWA manifest and mobile touch optimization.
