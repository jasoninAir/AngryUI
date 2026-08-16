# 🔥 AngryUI

<div align="center">

<img src="public/logo.png" alt="AngryUI Logo" width="128" height="128" />

# AngryUI

**The Modern, Feature-Rich Web UI & Remote Management Center for [Antigravity CLI](https://github.com/) (`agy`).**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-purple.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-70%20passing-brightgreen.svg)]()
[![i18n](https://img.shields.io/badge/i18n-5%20Languages-orange.svg)]()

[Features](#-key-features) • [Quick Start](#-quick-start) • [Multimodal & Attachments](#-multimodal-support) • [Internationalization](#-internationalization-i18n) • [Architecture](#-architecture) • [Security](#-security--dual-risk-control) • [Configuration](#-configuration) • [Production Deployment](#-production-deployment)

</div>

---

## ✨ Why "AngryUI"?

**AngryUI** is a homophonic wordplay inspired by **AGY** (`An-Gr-Y` ➔ `AGY`). It gives the Google Antigravity CLI a blazing-fast, aesthetic, and responsive Web interface that turns headless terminal operations into a first-class visual experience for developers across desktop, tablet, and mobile browsers.

---

## 🚀 Key Features

- ⚡ **Real-time Headless Streaming**: Direct integration with `agy --print --output-format stream-json`, parsing structured events and streaming agent responses, thinking tokens, and tool invocations over WebSocket with zero latency.
- 🖼️ **Multimodal & Clipboard Paste**:
  - Drag & drop local files or images directly onto the chat input.
  - **Instant Clipboard Paste (`Cmd+V` / `Ctrl+V`)** for screenshots from any device.
  - In-chat image thumbnail previews and full-screen **Lightbox Zoom Modal**.
  - Document attachments support with direct download and preview.
- 🌐 **5-Language Internationalization (i18n)**:
  - Supports **English, 简体中文, 繁體中文, 日本語, and Español**.
  - **Automatic Device Language Detection** on initial visit with English fallback.
  - Minimalist **"aA" Icon Popover** at the bottom-left of the sidebar.
- 🛡️ **Dual-Mode Permission & Security Control**:
  - **Protected Safe Mode (Default)**: Intercepts unapproved tool calls, rings a synthesized audio attention chime, and displays an on-screen **Dynamic Authorization Card** with 1-click single-turn allow, permanent allowlist sync, or WebTTY takeover.
  - **Auto-Approve Mode**: Automatically runs commands when you want hands-free execution.
- 📁 **Collapsible Workspace File Explorer**:
  - Slide-out right-side directory tree anchored to the current Session workspace.
  - Hierarchical lazy-loading subfolders, semantic filetype icons, and instant search filter.
  - **1-Click Relative Path Copy (📋)** and **Direct Chat Insertion (➕ `@path`)**.
- 🔄 **Zero-Lag Session Switching (`sessionCache`)**:
  - Global in-memory session retention preserves loaded message histories across session switches in the browser tab.
  - Automatic initial history prefetching on opening any session.
- 📝 **Auto-Growing Dynamic Chat Input**:
  - Expands smoothly with multi-line prompts up to `40vh` with built-in vertical scrolling.
- 💻 **WebTTY Terminal Modal**:
  - Full-featured `xterm.js` WebGL terminal fallback powered by `node-pty` with mobile virtual keys (`Esc`, `Tab`, `Ctrl+C`, arrows).
- 🗂️ **Hierarchical Project & Session Tree**:
  - Live session auto-sync from SQLite index and local `brain/` transcripts.
  - Persistent custom session renaming, workspace path association, and archive filtering.
- 🔋 **Battery & Network Energy Saver**:
  - Automatic `document.visibilityState` detection pauses background polling when the browser tab is hidden or minimized.
- 🔊 **Synthesized Web Audio Feedback**:
  - Multi-tone chimes for task completion and urgent permission/input alerts.

---

## 📦 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **Antigravity CLI** installed (`agy` in `~/.local/bin/agy` or in `$PATH`)

### 1. Development Mode

```bash
# Clone the repository
git clone https://github.com/your-username/angryui.git
cd angryui

# Install dependencies
npm install

# Start development servers (Vite Frontend :5173 + Backend :3737 concurrently)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🚢 Production Deployment

In production mode, AngryUI compiles into a unified single-port application. The Express backend serves the optimized React static assets, REST API, and WebSockets directly on port `5173`.

### Option A: Standard Production Launch

```bash
# Build frontend and compile backend
npm run build

# Start production server on default port 5173
npm start

# Or specify custom port via CLI argument or ENV
npm start -- --port 8080
AGY_WEBUI_PORT=8080 npm start
```

### Option B: High-Availability PM2 Daemon (Recommended)

AngryUI includes a production-ready `ecosystem.config.cjs`:

```bash
# Start with PM2 background daemon
npm run pm2:start

# View live streaming logs
npm run pm2:logs

# Restart or stop
npm run pm2:restart
npm run pm2:stop
```

---

## 🛠️ Configuration

You can customize AngryUI via environment variables or CLI flags:

| Parameter / Env Variable | CLI Flag | Default | Description |
|--------------------------|----------|---------|-------------|
| `AGY_WEBUI_PORT` | `-p, --port` | `5173` | Server listen port |
| `AGY_WEBUI_HOST` | `--host` | `0.0.0.0` | Bind address (`0.0.0.0` for LAN access, `127.0.0.1` for local-only) |
| `AGY_WEBUI_TOKEN` | `-t, --token` | (none) | Optional Bearer authentication token for HTTP & WebSocket |
| `AGY_BIN` | - | `~/.local/bin/agy` | Custom path to the `agy` binary |
| `AGY_HOME` | - | `~/.gemini/antigravity-cli` | Antigravity home directory |

---

## 🏛️ Architecture

```
angryui/
├── src/                          # React 19 Frontend
│   ├── components/
│   │   ├── chat/                # ChatContainer, MessageList, MessageItem, ChatInput, FileExplorerDrawer
│   │   ├── sidebar/             # Sidebar, WorkspaceGroup, ConversationItem, LanguageMenu
│   │   ├── settings/            # PermissionsPanel, QuotaPanel, SoundPanel
│   │   ├── common/              # ErrorBoundary
│   │   └── tui/                 # WebTTYModal (xterm.js + node-pty)
│   ├── context/                 # LanguageContext (i18n), SessionStatusContext, SidebarContext
│   ├── hooks/                   # useWebSocket, useConversation, useProjectIndex, useQuota
│   ├── i18n/                    # 5-Language dictionaries (en, zh-CN, zh-TW, ja, es)
│   └── lib/                     # Sound engine, API client, Model configurations
│
├── server/                      # Node.js + Express + TypeScript Backend
│   ├── config.ts                # Cross-platform config & CLI parser
│   ├── db/                      # SQLite conversation indexer & custom titles
│   ├── routes/                  # REST endpoints (projects, settings, upload, workspace)
│   ├── services/                # turnRunner, fileService, historyService, sessionMetaService, uploadService
│   ├── ws/                      # WebSocket ConversationHub event bus & PTY handlers
│   └── index.ts                 # Server entrypoint & graceful shutdown
│
├── public/                      # Static assets & multi-size favicons
└── tests/                       # 70 Vitest unit, contract & E2E integration test suites
```

---

## 🧪 Testing

AngryUI has comprehensive automated test coverage spanning unit, contract, and end-to-end scenarios:

```bash
# Run full automated test suite (70 tests)
npm test

# Run tests in watch mode
npm run test:watch
```

---

## 📄 License

MIT License. Open source and free for the community.
