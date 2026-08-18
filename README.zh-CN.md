# 🔥 AngryUI

<div align="center">

<img src="public/logo.png" alt="AngryUI Logo" width="128" height="128" />

# AngryUI

**专为 [Antigravity CLI](https://github.com/) (`agy`) 打造的现代化、全功能 Web 管理界面与远程控制中心。**

[English](README.md) • [简体中文](README.zh-CN.md) • [繁體中文](README.zh-TW.md) • [日本語](README.ja.md) • [Español](README.es.md)

<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-purple.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-70%20通过-brightgreen.svg)]()
[![i18n](https://img.shields.io/badge/i18n-5%20种语言-orange.svg)]()
[![Node](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

[为什么选择 AngryUI](#-为什么选择-angryui) • [核心功能](#-核心功能) • [快速开始](#-快速开始) • [生产部署](#-生产部署) • [远程与异地组网访问](#-远程与异地组网访问) • [PWA 移动端应用](#-pwa-移动端应用安装推荐体验) • [配置说明](#-配置说明) • [系统架构](#-系统架构) • [自动化测试](#-自动化测试) • [常见问题](#-常见问题)

</div>

---

## ✨ 为什么选择 "AngryUI"?

**AngryUI** 来源于 **AGY** 的谐音梗（`An-Gr-Y` ➔ `AGY`）。

Google Antigravity CLI (`agy`) 带来了极其强大的终端 AI 智能体编程能力，但在日常使用中开发者经常需要：
1. **远程与移动端监控**：通过手机、iPad 或另一台电脑在局域网/异地组网（VPN）下查看并推进长期运行的任务；
2. **多模态与截图上传**：直接通过拖拽文件或剪贴板快捷键（`Cmd+V` / `Ctrl+V`）粘贴图片并一键发送；
3. **工作区文件树导航**：在页面右侧直观浏览项目目录，一键复制相对路径并在对话框中直接 `@path` 引用；
4. **安全风控审批**：在未授权危险命令触发时拦截审批，支持声音警报、单次放行、永久白名单或一键打开 Web 终端接管。

**AngryUI 将终端命令行与 Web 交互深度融合**，打造出启动快、颜值高、响应流畅的现代化交互中心，运行内存常驻 **< 50MB**，无任何第三方云端锁定。

---

## 🚀 核心功能

### ⚡ 实时流式与思考链过程
- 直连 `agy --print --output-format stream-json`。
- 通过 WebSocket 毫秒级增量推送**深度思考折叠卡片（Thinking Accordion）**、**工具执行卡片（Tool Cards）**与最终助手文本。

### 🖼️ 多模态与剪贴板截图直接粘贴
- **剪贴板直接粘贴（`Cmd+V` / `Ctrl+V`）**：在任何设备上截完图直接在输入框粘贴。
- **拖拽上传**：支持将本地多图片、多文档文件直接拖拽至输入区。
- **全屏灯箱缩略图（Lightbox）**：聊天历史中图片支持高清缩略图预览与点击全屏放大缩放，文档文件支持点击直接下载。

### 🌐 5 种语言国际化（i18n）
- 原生支持 **English、简体中文、繁體中文、日本語、Español**。
- 首次访问**自动检测用户设备系统语言**并智能匹配（默认回退为 English）。
- 侧边栏左下方常驻极简 **"aA" 语言切换弹窗**，零视觉干扰。

### 🛡️ 双轨安全风控与审批体系
- **安全受控模式（默认）**：拦截未授权的终端命令或文件写入，播放合成 Web Audio 提示音，并在屏幕上弹出**动态授权审批卡片**：
  - `单次允许 (Allow Once)`：仅在当前轮次放行；
  - `永久允许 (Always Allow)`：将规则持久化写入 `settings.json`；
  - `打开 WebTTY`：一键调出嵌入式终端接管交互。
- **自动审批模式（Auto-Approve）**：针对无需干预的批处理场景实现全自动执行。

### 📁 可折叠的工作区文件树抽屉
- 右侧滑出式目录树，精准锚定当前 Session 对应的工作区路径。
- 层级式按需懒加载、语义化文件类型图标、实时文件名搜索过滤。
- **一键复制相对路径 (📋)** 与 **一键插入对话框 (➕ `@path`)**。

### 💻 嵌入式 WebTTY 终端模态框
- 基于 `node-pty` + `xterm.js` WebGL 加速渲染的全功能终端。
- 贴心内置移动端虚拟功能键栏（`Esc`、`Tab`、`Ctrl+C`、方向键），在手机平板触屏上也能自如操作命令行。

### 🗂️ 项目与会话管理
- 自动同步 SQLite 索引与本地 `brain/` 目录历史会话。
- 支持持久化自定义重命名会话、工作区路径关联、归档会话筛选。
- **零延迟会话切换缓存（`sessionCache`）**：浏览器内存常驻各会话历史，切换时秒级渲染。

### 🔋 节能与能效保护
- 自动侦测 `document.visibilityState`，当浏览器标签页处于后台或最小化时**自动暂停轮询请求**，大幅节约笔记本电量与网络流量。

---

## 📦 快速开始

### 前置要求

- **Node.js** >= 18.0.0
- 已安装 **Antigravity CLI**（`agy` 在 `~/.local/bin/agy` 或已配置在 `$PATH` 中）

### 1. 安装依赖

```bash
# 克隆仓库
git clone https://github.com/your-username/angryui.git
cd angryui

# 安装 NPM 依赖
npm install
```

### 2. 开发模式（适合编写与调试代码）

```bash
# 启动开发服务器（前端 Vite :5173 + 后端 :3737 同时运行并支持热更新）
npm run dev
```

在浏览器中打开 [http://localhost:5173](http://localhost:5173) 即可使用。

---

## 🚢 生产部署

在生产模式下，AngryUI 会被编译为**单端口一体化**应用。Express 后端会在单一端口 **`5173`** 上同时托管已压缩的前端静态资源、REST API 以及 WebSocket。

### 方式 A：高可用 PM2 守护进程（推荐日常使用）

AngryUI 预置了开箱即用的 `ecosystem.config.cjs`：

```bash
# 编译并启动后台常驻守护
npm run pm2:start

# 实时查看控制台输出日志
npm run pm2:logs

# 重启或停止服务
npm run pm2:restart
npm run pm2:stop

# 设置系统开机自启
pm2 startup && pm2 save
```

### 方式 B：原生 Node 直启

```bash
# 打包构建产物
npm run build

# 启动单端口生产服务（默认端口 5173）
npm start

# 或通过参数自定义端口
npm start -- --port 8080
AGY_WEBUI_PORT=8080 npm start
```

---

## 🌐 远程与异地组网访问

AngryUI 专为手机、iPad、异地笔记本通过**局域网（LAN）**或**异地组网/虚拟局域网（如蒲公英 PgyVPN、Tailscale、WireGuard、ZeroTier）**远程访问而设计：

```
┌────────────────────────────────────────────────────────┐
│                   远程设备 (手机 / iPad / 笔记本)         │
│             浏览器打开: http://192.168.x.x:5173         │
│                 或: http://172.16.x.x:5173             │
└───────────────────────────▲────────────────────────────┘
                            │ 局域网 / 异地组网 VPN 隧道
┌───────────────────────────▼────────────────────────────┐
│                    宿主主机 (Mac / Linux / Windows)    │
│               AngryUI 生产后端服务 (:5173)              │
└────────────────────────────────────────────────────────┘
```

1. 在宿主机器上运行 `npm run pm2:start`（或 `npm start`）；
2. 获取宿主机的局域网 IP（`ifconfig` / `ipconfig`）或异地组网虚拟 IP；
3. 在远程设备的浏览器中访问 `http://<宿主机IP>:5173` 即可。

---

## 📱 PWA 移动端应用安装（推荐体验）

为了在手机与平板上获得媲美原生 App 的沉浸式无边框操作体验，强烈推荐将 AngryUI 添加为 **渐进式 Web 应用（PWA）**：

- **iOS / iPadOS (Safari 浏览器)**：
  1. 在 Safari 中打开 `http://<宿主机IP>:5173`；
  2. 点击底部工具栏的 **分享** 按钮（向上箭头的方框）；
  3. 向下滚动并选择 **「添加到主屏幕」** (Add to Home Screen)；
  4. 从手机桌面点击 AngryUI 图标启动，享受全屏、无 Safari 地址栏遮挡的原生级控制体验。

- **Android (Chrome / Edge 浏览器)**：
  1. 在 Chrome 中打开 `http://<宿主机IP>:5173`；
  2. 点击右上角的 **更多选项 (⋮)**；
  3. 选择 **「安装应用」** 或 **「添加到主屏幕」**。

> **提示**：安装为 PWA 后，页面支持本地 Shell 秒开加载，触控终端虚拟按键与锁屏通知交互更加流畅。

---

## 🛠️ 配置说明

可以通过环境变量或 CLI 命令行参数灵活定制 AngryUI：

| 参数名 / 环境变量 | CLI 参数 | 默认值 | 详细说明 |
|------------------|----------|--------|----------|
| `AGY_WEBUI_PORT` | `-p, --port` | `5173` | 服务监听端口 |
| `AGY_WEBUI_HOST` | `--host` | `0.0.0.0` | 绑定网络接口（`0.0.0.0` 支持局域网/VPN访问，`127.0.0.1` 仅限本机） |
| `AGY_WEBUI_TOKEN`| `-t, --token`| (无) | 可选的安全鉴权 Token（设置后 HTTP 与 WebSocket 请求均需携带） |
| `AGY_BIN` | - | `~/.local/bin/agy` | 自定义 `agy` 可执行文件绝对路径 |
| `AGY_HOME` | - | `~/.gemini/antigravity-cli` | Antigravity CLI 的主配置与日志目录 |

---

## 🏛️ 系统架构

```
┌────────────────────────────────────────────────────────────────────────┐
│                           React 19 前端                                │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌───────────────┐  │
│  │ 聊天流 & 工具调用卡片 │ │ 工作区文件树抽屉   │ │ WebTTY 终端 │  │
│  └───────────┬───────────┘ └──────────┬───────────┘ └───────┬───────┘  │
│              │                        │                     │          │
│              └─────────────────┐      │      ┌──────────────┘          │
│                                ▼      ▼      ▼                         │
│                           REST API / WebSocket                         │
└────────────────────────────────────────┬───────────────────────────────┘
                                         │
┌────────────────────────────────────────▼───────────────────────────────┐
│                      Node.js Express 后端服务 (:5173)                  │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌───────────────┐  │
│  │ TurnRunner 子进程调度 │ │ SQLite 历史索引器  │ │ PTY 伪终端服务│  │
│  └───────────┬───────────┘ └──────────┬───────────┘ └───────┬───────┘  │
└──────────────┼────────────────────────┼─────────────────────┼──────────┘
               │ stream-json            │                     │
┌──────────────▼────────────────────────▼─────────────────────▼──────────┐
│                     Google Antigravity CLI (`agy`)                     │
│               ~/.gemini/antigravity-cli/brain/<session_id>             │
└────────────────────────────────────────────────────────────────────────┘
```

### 目录结构

```
angryui/
├── src/                          # React 19 前端源码
│   ├── components/
│   │   ├── chat/                # 聊天容器、消息列表、多模态输入框、工作区文件抽屉
│   │   ├── sidebar/             # 项目分组侧边栏、语言切换菜单、新建会话
│   │   ├── settings/            # 权限管理面板、Quota 配额面板、音效开关
│   │   ├── common/              # 错误边界 ErrorBoundary、全屏图片灯箱
│   │   └── tui/                 # WebTTY 终端模态框 (xterm.js + node-pty)
│   ├── context/                 # 语言国际化 Context、会话状态 Context、侧边栏 Context
│   ├── hooks/                   # useWebSocket、useConversation、useProjectIndex、useQuota
│   ├── i18n/                    # 5 种语言国际化字典 (en, zh-CN, zh-TW, ja, es)
│   └── lib/                     # Web Audio 音效引擎、API 请求封装、模型配置表
│
├── server/                      # Node.js + Express + TypeScript 后端源码
│   ├── config.ts                # 跨平台环境配置与 CLI 命令行解析
│   ├── db/                      # SQLite 会话元数据与自定义标题持久化
│   ├── routes/                  # REST 路由 (projects, settings, upload, workspace)
│   ├── services/                # turnRunner, fileService, historyService, sessionMetaService, uploadService
│   ├── ws/                      # WebSocket 消息中枢 ConversationHub 与 PTY 会话
│   └── index.ts                 # 服务启动入口与平滑停机控制
│
├── public/                      # 静态资源、Logo 与多尺寸 Favicon
└── tests/                       # 70 个 Vitest 单元、合约与端到端自动化测试集
```

---

## 🧪 自动化测试

项目拥有覆盖单元、契约、服务与端到端流式集成的全量自动化测试：

```bash
# 运行全量 70 个测试用例（覆盖 21 个测试文件）
npm test

# 启动监听测试模式
npm run test:watch
```

---

## ❓ 常见问题

### 1. 提示 `agy: command not found` 或 `Cannot find agy binary`
请确保本机已安装 Google Antigravity CLI。如果 `agy` 安装在非标准路径，可通过环境变量指定：
```bash
export AGY_BIN="/your/custom/path/to/agy"
npm start
```

### 2. 异地组网或远程设备无法连接
- 检查宿主机器防火墙是否已放行 `5173` 端口；
- macOS 用户：打开 **「系统设置」** $\rightarrow$ **「网络」** $\rightarrow$ **「防火墙」** $\rightarrow$ 确认 `node` 处于“允许传入连接”状态；
- 确认 `AGY_WEBUI_HOST` 已设置为 `0.0.0.0`（默认）。

### 3. `5173` 端口已被其他进程占用
可通过命令行参数或环境变量指定其他任意空闲端口：
```bash
npm start -- --port 8080
# 或
AGY_WEBUI_PORT=8080 npm start
```

---

## 📄 开源协议

基于 [MIT License](LICENSE) 开源，社区免费使用。
