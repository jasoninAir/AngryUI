# 🔥 AngryUI

<div align="center">

<img src="public/logo.png" alt="AngryUI Logo" width="128" height="128" />

# AngryUI

**專為 [Antigravity CLI](https://github.com/) (`agy`) 打造的現代化、全功能 Web 管理介面與遠端控制中心。**

[English](README.md) • [简体中文](README.zh-CN.md) • [繁體中文](README.zh-TW.md) • [日本語](README.ja.md) • [Español](README.es.md)

<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-purple.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-70%20通過-brightgreen.svg)]()
[![i18n](https://img.shields.io/badge/i18n-5%20種語言-orange.svg)]()
[![Node](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

[為什麼選擇 AngryUI](#-為什麼選擇-angryui) • [核心功能](#-核心功能) • [快速開始](#-快速開始) • [生產部署](#-生產部署) • [遠端與異地組網訪問](#-遠端與異地組網訪問) • [設定說明](#-設定說明) • [系統架構](#-系統架構) • [自動化測試](#-自動化測試) • [常見問題](#-常見問題)

</div>

---

## ✨ 為什麼選擇 "AngryUI"?

**AngryUI** 源自於 **AGY** 的諧音梗（`An-Gr-Y` ➔ `AGY`）。

Google Antigravity CLI (`agy`) 帶來了極其強大的終端 AI 智能體編程能力，但在日常使用中開發者經常需要：
1. **遠端與行動端監控**：透過手機、iPad 或另一台電腦在區域網路/異地組網（VPN）下查看並推進長期運行的任務；
2. **多模態與截圖上傳**：直接透過拖曳檔案或剪貼簿快捷鍵（`Cmd+V` / `Ctrl+V`）貼上圖片並一鍵發送；
3. **工作區檔案樹導航**：在頁面右側直觀瀏覽專案目錄，一鍵複製相對路徑並在對話框中直接 `@path` 引用；
4. **安全風控審批**：在未授權危險指令觸發時攔截審批，支援聲音警報、單次放行、永久白名單或一鍵開啟 Web 終端接管。

**AngryUI 將終端命令列與 Web 互動深度融合**，打造出啟動快、顏值高、響應流暢的現代化互動中心，運行記憶體常駐 **< 50MB**，無任何第三方雲端鎖定。

---

## 🚀 核心功能

### ⚡ 即時串流與思考鏈過程
- 直連 `agy --print --output-format stream-json`。
- 透過 WebSocket 毫秒級增量推送**深度思考折疊卡片（Thinking Accordion）**、**工具執行卡片（Tool Cards）**與最終助手文字。

### 🖼️ 多模態與剪貼簿截圖直接貼上
- **剪貼簿直接貼上（`Cmd+V` / `Ctrl+V`）**：在任何設備上截完圖直接在輸入框貼上。
- **拖曳上傳**：支援將本機多圖片、多文件檔案直接拖曳至輸入區。
- **全螢幕燈箱縮圖（Lightbox）**：聊天歷史中圖片支援高清縮圖預覽與點擊全螢幕放大縮小，文件檔案支援點擊直接下載。

### 🌐 5 種語言國際化（i18n）
- 原生支援 **English、简体中文、繁體中文、日本語、Español**。
- 首次訪問**自動檢測使用者設備系統語言**並智慧匹配（預設回退為 English）。
- 側邊欄左下方常駐極簡 **"aA" 語言切換彈窗**，零視覺干擾。

### 🛡️ 雙軌安全風控與審批體系
- **安全受控模式（預設）**：攔截未授權的終端指令或檔案寫入，播放合成 Web Audio 提示音，並在螢幕上彈出**動態授權審批卡片**：
  - `單次允許 (Allow Once)`：僅在當前輪次放行；
  - `永久允許 (Always Allow)`：將規則持久化寫入 `settings.json`；
  - `打開 WebTTY`：一鍵調出嵌入式終端接管互動。
- **自動審批模式（Auto-Approve）**：針對無需干預的批處理場景實現全自動執行。

### 📁 可折疊的工作區檔案樹抽屜
- 右側滑出式目錄樹，精準錨定當前 Session 對應的工作區路徑。
- 層級式隨選載入、語意化檔案類型圖示、即時檔案名稱搜尋過濾。
- **一鍵複製相對路徑 (📋)** 與 **一鍵插入對話框 (➕ `@path`)**。

### 💻 嵌入式 WebTTY 終端模態框
- 基於 `node-pty` + `xterm.js` WebGL 加速渲染的全功能終端。
- 貼心內建行動端虛擬功能鍵欄（`Esc`、`Tab`、`Ctrl+C`、方向鍵），在手機平板觸控螢幕上也能自如操作命令列。

### 🗂️ 專案與對話管理
- 自動同步 SQLite 索引與本機 `brain/` 目錄歷史對話。
- 支援持久化自訂重新命名對話、工作區路徑關聯、封存對話篩選。
- **零延遲對話切換快取（`sessionCache`）**：瀏覽器記憶體常駐各對話歷史，切換時秒級渲染。

### 🔋 節能與能效保護
- 自動偵測 `document.visibilityState`，當瀏覽器分頁處於背景或最小化時**自動暫停輪詢請求**，大幅節約筆電電量與網路流量。

---

## 📦 快速開始

### 前置要求

- **Node.js** >= 18.0.0
- 已安裝 **Antigravity CLI**（`agy` 在 `~/.local/bin/agy` 或已配置在 `$PATH` 中）

### 1. 安裝依賴

```bash
# 複製儲存庫
git clone https://github.com/your-username/angryui.git
cd angryui

# 安裝 NPM 依賴
npm install
```

### 2. 開發模式（適合編寫與調試程式碼）

```bash
# 啟動開發伺服器（前端 Vite :5173 + 後端 :3737 同時運行並支援熱更新）
npm run dev
```

在瀏覽器中開啟 [http://localhost:5173](http://localhost:5173) 即可使用。

---

## 🚢 生產部署

在生產模式下，AngryUI 會被編譯為**單連接埠一體化**應用。Express 後端會在單一連接埠 **`5173`** 上同時代管已壓縮的前端靜態資源、REST API 以及 WebSocket。

### 方式 A：高可用 PM2 守護程序（推薦日常使用）

AngryUI 預置了開箱即用的 `ecosystem.config.cjs`：

```bash
# 編譯並啟動後台常駐守護
npm run pm2:start

# 即時查看主控台輸出日誌
npm run pm2:logs

# 重啟或停止服務
npm run pm2:restart
npm run pm2:stop

# 設定系統開機自啟
pm2 startup && pm2 save
```

### 方式 B：原生 Node 直啟

```bash
# 打包建置產物
npm run build

# 啟動單連接埠生產服務（預設連接埠 5173）
npm start

# 或透過參數自訂連接埠
npm start -- --port 8080
AGY_WEBUI_PORT=8080 npm start
```

---

## 🌐 遠端與異地組網訪問

AngryUI 專為手機、iPad、異地筆記型電腦透過**區域網路（LAN）**或**異地組網/虛擬區域網路（如蒲公英 PgyVPN、Tailscale、WireGuard、ZeroTier）**遠端訪問而設計：

```
┌────────────────────────────────────────────────────────┐
│                   遠端設備 (手機 / iPad / 筆電)         │
│             瀏覽器開啟: http://192.168.x.x:5173         │
│                 或: http://172.16.x.x:5173             │
└───────────────────────────▲────────────────────────────┘
                            │ 區域網路 / 異地組網 VPN 隧道
┌───────────────────────────▼────────────────────────────┐
│                    主機 (Mac / Linux / Windows)        │
│               AngryUI 生產後端服務 (:5173)              │
└────────────────────────────────────────────────────────┘
```

1. 在主機上運行 `npm run pm2:start`（或 `npm start`）；
2. 取得主機的區域網路 IP（`ifconfig` / `ipconfig`）或異地組網虛擬 IP；
3. 在遠端設備的瀏覽器中訪問 `http://<主機IP>:5173` 即可。

---

## 🛠️ 設定說明

可以透過環境變數或 CLI 命令列參數靈活自訂 AngryUI：

| 參數名 / 環境變數 | CLI 參數 | 預設值 | 詳細說明 |
|------------------|----------|--------|----------|
| `AGY_WEBUI_PORT` | `-p, --port` | `5173` | 服務監聽連接埠 |
| `AGY_WEBUI_HOST` | `--host` | `0.0.0.0` | 綁定網路介面（`0.0.0.0` 支援區域網路/VPN訪問，`127.0.0.1` 僅限本機） |
| `AGY_WEBUI_TOKEN`| `-t, --token`| (無) | 可選的安全鑑權 Token（設定後 HTTP 與 WebSocket 請求均需攜帶） |
| `AGY_BIN` | - | `~/.local/bin/agy` | 自訂 `agy` 可執行檔絕對路徑 |
| `AGY_HOME` | - | `~/.gemini/antigravity-cli` | Antigravity CLI 的主設定與日誌目錄 |

---

## 🏛️ 系統架構

```
┌────────────────────────────────────────────────────────────────────────┐
│                           React 19 前端                                │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌───────────────┐  │
│  │ 聊天流 & 工具呼叫卡片 │ │ 工作區檔案樹抽屜   │ │ WebTTY 終端 │  │
│  └───────────┬───────────┘ └──────────┬───────────┘ └───────┬───────┘  │
│              │                        │                     │          │
│              └─────────────────┐      │      ┌──────────────┘          │
│                                ▼      ▼      ▼                         │
│                           REST API / WebSocket                         │
└────────────────────────────────────────┬───────────────────────────────┘
                                         │
┌────────────────────────────────────────▼───────────────────────────────┐
│                      Node.js Express 後端服務 (:5173)                  │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌───────────────┐  │
│  │ TurnRunner 子程序調度 │ │ SQLite 歷史索引器  │ │ PTY 偽終端服務│  │
│  └───────────┬───────────┘ └──────────┬───────────┘ └───────┬───────┘  │
└──────────────┼────────────────────────┼─────────────────────┼──────────┘
               │ stream-json            │                     │
┌──────────────▼────────────────────────▼─────────────────────▼──────────┐
│                     Google Antigravity CLI (`agy`)                     │
│               ~/.gemini/antigravity-cli/brain/<session_id>             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🧪 自動化測試

專案擁有覆蓋單元、契約、服務與端對端串流整合的全量自動化測試：

```bash
# 運行全量 70 個測試用例（覆蓋 21 個測試檔案）
npm test

# 啟動監聽測試模式
npm run test:watch
```

---

## 📄 開源授權

基於 [MIT License](LICENSE) 開源，社群免費使用。
