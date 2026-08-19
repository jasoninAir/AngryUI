# 🔥 AngryUI

<div align="center">

<img src="public/logo.png" alt="AngryUI Logo" width="128" height="128" />

# AngryUI

**The Modern, Feature-Rich Web UI & Remote Management Center for [Antigravity CLI](https://github.com/) (`agy`).**

[English](README.md) • [简体中文](README.zh-CN.md) • [繁體中文](README.zh-TW.md) • [日本語](README.ja.md) • [Español](README.es.md)

<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-purple.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-70%20passing-brightgreen.svg)]()
[![i18n](https://img.shields.io/badge/i18n-5%20Languages-orange.svg)]()
[![Node](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

[Why AngryUI](#-why-angryui) • [Key Features](#-key-features) • [Quick Start](#-quick-start) • [Production Deployment](#-production-deployment) • [Remote & VPN Access](#-remote--vpn-access) • [PWA App](#-pwa-mobile-app-recommended) • [Configuration](#-configuration) • [Architecture](#-architecture) • [Testing](#-testing) • [Troubleshooting](#-troubleshooting)

</div>

---

## ✨ Why "AngryUI"?

**AngryUI** is a homophonic wordplay inspired by **AGY** (`An-Gr-Y` ➔ `AGY`). 

While Antigravity CLI (`agy`) provides an incredibly powerful agentic AI coding engine in your terminal, developers often need to:
1. **Chat and monitor long-running tasks remotely** from mobile phones, tablets, or laptops across LAN / VPN networks.
2. **Send multimodal screenshots and attachments** via simple drag-and-drop or clipboard paste (`Cmd+V` / `Ctrl+V`).
3. **Inspect workspace file trees** and reference files (`@path`) visually without typing full paths manually.
4. **Safely approve tool permissions** with dedicated audio chimes, modal approvals, or integrated WebTTY terminal takeovers.

**AngryUI bridges the terminal and the browser** into an ultra-fast, aesthetic, and responsive web management hub with **< 50MB RAM footprint** and **zero external cloud lock-in**.

---

## 🚀 Key Features

### ⚡ Real-Time Streaming & Thinking Process
- Direct integration with `agy --print --output-format stream-json`.
- Zero-latency incremental WebSocket pushing of **Thinking Accordions**, **Tool Execution Cards**, and final assistant text.

### 🖼️ Multimodal & Clipboard Screenshot Paste
- **Instant Clipboard Paste (`Cmd+V` / `Ctrl+V`)**: Paste screenshots directly from your clipboard on any device.
- **Drag & Drop Uploads**: Drop local files or images directly onto the chat area.
- **In-Chat Lightbox**: High-resolution image preview with full-screen zoom and document download cards.

### 🌐 5-Language Internationalization (i18n)
- Native localization for **English, 简体中文, 繁體中文, 日本語, and Español**.
- **Automatic Device Language Detection** on initial visit with English fallback.
- Minimalist **"aA" Icon Popover** anchored to the bottom-left sidebar.

### 🛡️ Dual-Mode Security & Risk Control
- **Protected Safe Mode (Default)**: Intercepts high-risk tool calls (bash commands, file writes), plays a synthesized Web Audio chime, and displays an on-screen **Dynamic Authorization Card** with:
  - `Allow Once` (Single-turn execution)
  - `Always Allow` (Persists to `settings.json`)
  - `Open WebTTY` (Takes over the interactive terminal in-browser)
- **Auto-Approve Mode**: Automatically executes commands for hands-free workflows.

### 📁 Workspace File Explorer Drawer
- Collapsible slide-out directory tree anchored to the current Session workspace.
- Hierarchical lazy-loading subfolders, semantic filetype icons, and instant search filter.
- **1-Click Relative Path Copy (📋)** and **Direct Chat Insertion (➕ `@path`)**.

### 💻 Embedded WebTTY Terminal Modal
- Full-featured `xterm.js` WebGL terminal powered by `node-pty`.
- Mobile virtual helper keys (`Esc`, `Tab`, `Ctrl+C`, arrow keys) for managing CLI sessions on touchscreens.

### 🗂️ Project & Session Management
- Live session auto-sync from SQLite index and local `brain/` transcripts.
- Custom session renaming, workspace path association, and archive filtering.
- **Zero-Lag Session Switching (`sessionCache`)**: In-memory tab caching preserves conversation histories across session switches.

### 🔋 Battery & Network Energy Saver
- Automatic `document.visibilityState` detection pauses background polling when the browser tab is hidden or minimized.

---

## 📦 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **Antigravity CLI** installed (`agy` in `~/.local/bin/agy` or available in `$PATH`)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-username/angryui.git
cd angryui

# Install dependencies
npm install
```

### 2. Development Mode (For Code Editing)

```bash
# Start development servers (Vite Frontend :5173 + Backend :3737 concurrently)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🚢 Production Deployment

In production mode, AngryUI compiles into a single-port unified application. The Express backend serves the optimized React static assets, REST API, and WebSockets directly on **port `5173`**.

### Option A: High-Availability PM2 Daemon (Recommended)

AngryUI includes a production-ready `ecosystem.config.cjs`:

```bash
# Build and launch background daemon
npm run pm2:start

# View live streaming logs
npm run pm2:logs

# Restart or stop
npm run pm2:restart
npm run pm2:stop

# Enable startup on system reboot
pm2 startup && pm2 save
```

### Option B: Direct Node Production Launch

```bash
# Build production bundle
npm run build

# Start single-port server on default port 5173
npm start

# Or specify a custom port
npm start -- --port 8080
AGY_WEBUI_PORT=8080 npm start
```

---

## 🌐 Remote & VPN Access

AngryUI is designed to be accessed from any phone, iPad, laptop, or remote workstation over your Local Network (LAN) or Overlay VPN (e.g. PgyVPN / Tailscale / WireGuard / ZeroTier):

```
┌────────────────────────────────────────────────────────┐
│                   Remote Device (Phone/iPad)           │
│             Browser: http://192.168.x.x:5173           │
│                 or: http://172.16.x.x:5173             │
└───────────────────────────▲────────────────────────────┘
                            │ LAN / Overlay VPN
┌───────────────────────────▼────────────────────────────┐
│                    Host Machine (Mac/Linux/Win)        │
│               AngryUI Production Server (:5173)        │
└────────────────────────────────────────────────────────┘
```

1. Ensure AngryUI is running via `npm run pm2:start` (or `npm start`).
2. On your host machine, find your LAN IP (`ifconfig` or `ipconfig`) or VPN IP.
3. Open `http://<HOST_IP>:5173` on your remote device.

---

## 📱 PWA Mobile App (Recommended)

For the best mobile and tablet experience, AngryUI is optimized to run as a standalone **Progressive Web App (PWA)**:

- **iOS / iPadOS (Safari)**:
  1. Open `http://<HOST_IP>:5173` in Safari.
  2. Tap the **Share** icon (square with arrow up).
  3. Scroll and select **"Add to Home Screen"** (添加到主屏幕).
  4. Launch AngryUI directly from your home screen for an immersive, full-screen, address-bar-free experience.

- **Android (Chrome / Edge)**:
  1. Open `http://<HOST_IP>:5173` in Chrome.
  2. Tap the **Three Dots Menu (⋮)** in the top right.
  3. Select **"Install App"** or **"Add to Home Screen"**.

> **Pro Tip**: Running AngryUI as an installed PWA gives you native fullscreen, fast local shell caching, and seamless touchscreen terminal interactions.

---

## 🛠️ Configuration

You can customize AngryUI via environment variables or CLI flags:

| Parameter / Env Variable | CLI Flag | Default | Description |
|--------------------------|----------|---------|-------------|
| `AGY_WEBUI_PORT` | `-p, --port` | `5173` | Server listen port |
| `AGY_WEBUI_HOST` | `--host` | `0.0.0.0` | Bind address (`0.0.0.0` for LAN/VPN access, `127.0.0.1` for local-only) |
| `AGY_WEBUI_TOKEN` | `-t, --token` | (none) | Optional Bearer authentication token for HTTP & WebSocket |
| `AGY_BIN` | - | `~/.local/bin/agy` | Custom path to the `agy` binary |
| `AGY_HOME` | - | `~/.gemini/antigravity-cli` | Antigravity home directory |

---

## 🏛️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                           React 19 Frontend                            │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌───────────────┐  │
│  │ Chat & Tool Cards     │ │ Workspace Explorer   │ │ WebTTY Modal  │  │
│  └───────────┬───────────┘ └──────────┬───────────┘ └───────┬───────┘  │
│              │                        │                     │          │
│              └─────────────────┐      │      ┌──────────────┘          │
│                                ▼      ▼      ▼                         │
│                           REST API / WebSocket                         │
└────────────────────────────────────────┬───────────────────────────────┘
                                         │
┌────────────────────────────────────────▼───────────────────────────────┐
│                      Node.js Express Server (:5173)                    │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌───────────────┐  │
│  │ TurnRunner Subprocess │ │ SQLite Indexer       │ │ PTY Terminal  │  │
│  └───────────┬───────────┘ └──────────┬───────────┘ └───────┬───────┘  │
└──────────────┼────────────────────────┼─────────────────────┼──────────┘
               │ stream-json            │                     │
┌──────────────▼────────────────────────▼─────────────────────▼──────────┐
│                     Google Antigravity CLI (`agy`)                     │
│               ~/.gemini/antigravity-cli/brain/<session_id>             │
└────────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
angryui/
├── src/                          # React 19 Frontend
│   ├── components/
│   │   ├── chat/                # ChatContainer, MessageList, MessageItem, ChatInput, FileExplorerDrawer
│   │   ├── sidebar/             # Sidebar, WorkspaceGroup, ConversationItem, LanguageMenu
│   │   ├── settings/            # PermissionsPanel, QuotaPanel, SoundPanel
│   │   ├── common/              # ErrorBoundary, Lightbox
│   │   └── tui/                 # WebTTYModal (xterm.js + node-pty)
│   ├── context/                 # LanguageContext (i18n), SessionStatusContext, SidebarContext
│   ├── hooks/                   # useWebSocket, useConversation, useProjectIndex, useQuota
│   ├── i18n/                    # 5-Language dictionaries (en, zh-CN, zh-TW, ja, es)
│   └── lib/                     # Sound engine, API client, Model configurations
│
├── server/                      # Node.js + Express + TypeScript Backend
│   ├── config.ts                # Cross-platform config & CLI argument parser
│   ├── db/                      # SQLite conversation indexer & custom titles
│   ├── routes/                  # REST endpoints (projects, settings, upload, workspace)
│   ├── services/                # turnRunner, fileService, historyService, sessionMetaService, uploadService
│   ├── ws/                      # WebSocket ConversationHub event bus & PTY handlers
│   └── index.ts                 # Server entrypoint & graceful shutdown
│
├── public/                      # Static assets, logos & multi-size favicons
└── tests/                       # 70 Vitest unit, contract & E2E integration test suites
```

---

## 🧪 Testing

AngryUI is built with robust test coverage across unit, contract, and end-to-end integration layers:

```bash
# Run full automated test suite (70 tests across 21 test files)
npm test

# Run tests in watch mode
npm run test:watch
```

---

## ❓ Troubleshooting

### 1. `agy: command not found` or `Cannot find agy binary`
Ensure Google Antigravity CLI is installed. If `agy` is located in a custom path, you can set the `AGY_BIN` environment variable:
```bash
export AGY_BIN="/custom/path/to/agy"
npm start
```

### 2. Cannot connect from remote/VPN devices
- Verify that your host firewall allows incoming connections on port `5173`.
- On macOS: Check **System Settings** $\rightarrow$ **Network** $\rightarrow$ **Firewall** $\rightarrow$ Ensure `node` is allowed.
- Ensure `AGY_WEBUI_HOST` is set to `0.0.0.0` (default).

### 3. Port `5173` is already in use
Specify a different port using either the CLI flag or environment variable:
```bash
npm start -- --port 8080
# or
AGY_WEBUI_PORT=8080 npm start
```

---

## 🙏 Acknowledgments & Inspiration

Special thanks to [Claude Code UI (claudecodeui)](https://github.com/siteboon/claudecodeui) by [@siteboon](https://github.com/siteboon) for providing invaluable inspiration and architectural insights for modern web-based AI coding assistant interfaces.

---

## 📄 License

MIT License. Open source and free for the community.

