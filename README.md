# AGY Web UI

A browser-based remote interface for the [Antigravity CLI](https://github.com/) (`agy`). Lets you browse projects, chat with the agent, switch models per-turn, manage permissions, and fall back to a full TUI session when the agent asks for interactive input.

## Features

- **Grouped project sidebar** — reads `~/.gemini/antigravity-cli/conversation_summaries.db` directly; live updates via `chokidar`
- **Streaming chat** — server-side `agy --conversation <id> --print ... --output-format stream-json` per turn, parses JSON events and forwards them over WebSocket
- **Per-turn model switching** — Gemini Flash / Pro, Claude Sonnet / Opus, GPT-OSS
- **Conversation Hub** — multiple browser tabs / devices can subscribe to the same conversation; ring buffer replays recent events on reconnect
- **Permissions editor** — view / add / remove `permissions.allow` patterns in `settings.json` (atomic writes to avoid corruption)
- **WebTTY fallback** — on-demand `node-pty` + `xterm.js` interactive session for `ask_permission` / `ask_question` prompts the chat engine can't handle
- **Mobile virtual keys** — Esc / Tab / Ctrl+C / arrows / Enter inline at the bottom of WebTTY
- **Quota display** — issues `agy /quota` and renders the response
- **Optional Bearer token auth** — set `AGY_WEBUI_TOKEN` to gate requests

## Quick start

```bash
npm install
npm run dev          # Vite on 5173, Express on 3000
```

Open <http://localhost:5173/>.

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `AGY_WEBUI_PORT` | `3000` | Express server port |
| `AGY_WEBUI_HOST` | `0.0.0.0` | Bind address (use `127.0.0.1` for local-only) |
| `AGY_WEBUI_TOKEN` | (none) | Bearer token; gate HTTP + WebSocket access |
| `AGY_BIN` | `~/.local/bin/agy` | Override the AGY binary path |

## Architecture

```
src/                            React frontend
├── hooks/                      useWebSocket, useConversation, useProjectIndex, useQuota
├── components/
│   ├── sidebar/                grouped project tree
│   ├── chat/                   MessageList, MessageItem, ChatInput, ChatContainer
│   ├── settings/               PermissionsPanel, QuotaPanel
│   └── tui/                    WebTTYModal (lazy-loaded)
├── pages/                      ChatPage, SettingsPage
└── App.tsx                     Router + sidebar

server/                         Node.js backend
├── db/                         better-sqlite3 read-only client + index
├── services/
│   ├── discoveryService.ts     chokidar watcher on conversation_summaries.db
│   ├── turnRunner.ts           spawn agy, parse stream-json, async iterator
│   ├── settingsService.ts      read / atomic write settings.json
│   └── ptyManager.ts           node-pty wrapper (graceful degradation)
├── ws/
│   ├── conversationHub.ts      per-conversation event bus + ring buffer
│   └── handlers/               chatHandler, tuiHandler
└── index.ts                    Express + ws + graceful shutdown
```

## Scripts

```bash
npm run dev         # start both server and client
npm run dev:server  # tsx watch server/index.ts
npm run dev:client  # vite
npm run build       # vite build + tsc server
npm start           # node dist-server/server/index.js
npm test            # vitest run
npm run test:watch  # vitest
```

## How permission prompts work

`agy --print` mode **does not** forward stdin to the agent — it auto-denies any tool call that isn't in `permissions.allow`. The Web UI handles this in two ways:

1. **Pre-approved patterns** — Edit the allow list in `/settings` to whitelist commands you'll routinely use.
2. **WebTTY fallback** — When the agent hits `ask_permission` / `ask_question`, the chat server emits a `chat:interactive_prompt` event. The browser auto-opens WebTTY (or you can click **Open WebTTY** manually). The PTY session runs the full interactive TUI so you can answer the prompt natively.

## Tested assumptions

Verified against the local AGY 1.1.13 install:

- Stream-JSON schema: 5 top-level events (`init`, `step_update`, `result`), 6 step types (`user_input`, `system_message`, `agent_response`, `tool`, `checkpoint`, `unknown`)
- `--effort` is **NOT supported** by Gemini 3.x Flash models — model selector omits the effort dropdown for them
- `--conversation <id>` correctly resumes multi-turn context (step_index continues, cache_read_tokens grows)
- Prompt caching works (`cache_read_tokens` reaches hundreds of thousands)

Tracked in `docs/superpowers/notes/2026-08-15-spike-verification-findings.md`.

## Browser compatibility

Modern Chromium / Firefox / Safari. Mobile browsers work, including WebTTY virtual keys for touch input.

## License

Private / Not for redistribution.
