# 🔥 AngryUI

<div align="center">

**The Modern, Feature-Rich Web UI & Remote Management Center for [Antigravity CLI](https://github.com/) (`agy`).**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-teal.svg)](https://tailwindcss.com/)

[Features](#-key-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Security & Permissions](#-security--dual-risk-control) • [File Explorer](#-workspace-file-explorer) • [Configuration](#-configuration)

</div>

---

## ✨ Why "AngryUI"?

**AngryUI** is a homophonic wordplay inspired by **AGY** (`An-Gr-Y` ➔ `AGY`). It gives Google Antigravity CLI a fast, beautiful, responsive Web interface that turns headless terminal operations into a first-class visual experience for developers across desktop and mobile browsers.

---

## 🚀 Key Features

- ⚡ **Headless Real-time Streaming** — Direct integration with `agy --print --output-format stream-json`, parsing structured events and streaming agent responses, tool invocations, and thinking tokens over WebSocket with zero latency.
- 🛡️ **Dual-Mode Permission & Security Control**:
  - **Protected Safe Mode (Default)**: Intercepts unapproved tool calls, rings an synthesized audio attention chime, and displays an on-screen **Dynamic Authorization Card** with 1-click single turn allow, permanent allowlist sync, or WebTTY takeover.
  - **Auto-Approve Mode**: Automatically runs commands when you want hands-free execution.
- 📁 **Collapsible Workspace File Explorer**:
  - Slide-out right-side directory tree anchored to the current Session workspace.
  - Hierarchical lazy-loading subfolders, semantic filetype icons, and instant search filter.
  - **1-Click Relative Path Copy (📋)** and **Direct Chat Insertion (➕ `@path`)**.
- 🔄 **Zero-Lag Session Switching (`sessionCache`)**:
  - Global in-memory session retention preserves all loaded message histories across session switches in the browser tab.
  - Auto initial history prefetching on first opening any session.
- 📝 **Auto-Growing Dynamic Chat Input**:
  - Expands smoothly with multi-line prompts up to `40vh` with built-in vertical scrolling.
- 💻 **WebTTY Terminal Modal**:
  - Full-featured xterm.js WebGL terminal fallback powered by `node-pty` with mobile virtual keys (Esc, Tab, Ctrl+C, arrows).
- 🗂️ **Hierarchical Project & Session Tree**:
  - Live session auto-sync from SQLite index and local `brain/` transcripts.
  - Persistent custom session renaming and workspace path association.
- 🔊 **Synthesized Web Audio Feedback**:
  - Multi-tone chimes for task completion and urgent permission/input alerts.

---

## 📦 Quick Start

### Prerequisites

- Node.js >= 18
- Antigravity CLI installed (`agy` in `~/.local/bin/agy` or in `$PATH`)

### Installation & Launch

```bash
# 1. Clone the repository
git clone https://github.com/your-username/angryui.git
cd angryui

# 2. Install dependencies
npm install

# 3. Start development server (Frontend + Backend concurrently)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠️ Configuration

You can customize AngryUI via environment variables:

| Environment Variable | Default | Description |
|----------------------|---------|-------------|
| `AGY_WEBUI_PORT` | `3737` | Backend Express server port (or use `--port <port>`) |
| `AGY_WEBUI_HOST` | `0.0.0.0` | Bind address (`0.0.0.0` for LAN access, `127.0.0.1` for local-only) |
| `AGY_WEBUI_TOKEN` | (none) | Optional Bearer authentication token for HTTP & WebSocket |
| `AGY_BIN` | `~/.local/bin/agy` | Custom path to the `agy` binary |
| `AGY_HOME` | `~/.gemini/antigravity-cli` | Antigravity home directory |

---

## 🏛️ Architecture

```
angryui/
├── src/                          # React 19 Frontend
│   ├── hooks/                   # useWebSocket, useConversation, useProjectIndex, useQuota
│   ├── components/
│   │   ├── chat/                # ChatContainer, MessageList, ChatInput, FileExplorerDrawer
│   │   ├── sidebar/             # Workspace tree, Project grouping, New Session modal
│   │   ├── settings/            # PermissionsPanel, QuotaPanel
│   │   └── tui/                 # WebTTYModal (xterm.js + node-pty)
│   ├── lib/                     # Sound engine, API client, Model configurations
│   └── App.tsx                  # Main router and layout
│
├── server/                      # Node.js + Express + TypeScript Backend
│   ├── db/                      # SQLite conversation summaries & custom titles
│   ├── services/
│   │   ├── turnRunner.ts        # agy spawn process manager & stream parser
│   │   ├── fileService.ts       # Safe workspace file tree & relative path listing
│   │   ├── sessionSummaryService.ts # Transcript parser & summary extractor
│   │   └── settingsService.ts   # Atomic settings.json permission management
│   ├── ws/                      # WebSocket ConversationHub event bus & PTY sessions
│   └── index.ts                 # Server entrypoint & route registration
│
└── tests/                       # Vitest unit & integration test suites
```

---

## 🧪 Testing & Building

```bash
# Run full automated test suite (51 tests)
npm test

# Build production bundle (Vite + Server TypeScript)
npm run build

# Start production server
npm start
```

---

## 📄 License

MIT License. Open source and free for the community.
