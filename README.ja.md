# 🔥 AngryUI

<div align="center">

<img src="public/logo.png" alt="AngryUI Logo" width="128" height="128" />

# AngryUI

**[Antigravity CLI](https://github.com/) (`agy`) のためのモダンで高機能な Web 管理 UI & リモートコントロールセンター。**

[English](README.md) • [简体中文](README.zh-CN.md) • [繁體中文](README.zh-TW.md) • [日本語](README.ja.md) • [Español](README.es.md)

<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-purple.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-70%20passed-brightgreen.svg)]()
[![i18n](https://img.shields.io/badge/i18n-5%20言語対応-orange.svg)]()
[![Node](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

[AngryUI とは](#-angryui-とは) • [主な機能](#-主な機能) • [クイックスタート](#-クイックスタート) • [本番環境デプロイ](#-本番環境デプロイ) • [リモート・VPN アクセス](#-リモートvpn-アクセス) • [設定項目](#-設定項目) • [アーキテクチャ](#-アーキテクチャ) • [テスト](#-テスト) • [トラブルシューティング](#-トラブルシューティング)

</div>

---

## ✨ AngryUI とは？

**AngryUI** は、**AGY** にインスパイアされた言葉遊びから名付けられました（`An-Gr-Y` ➔ `AGY`）。

Google Antigravity CLI (`agy`) はターミナル上で極めて強力な AI エージェントコーディング機能を提供しますが、日々の開発において以下のようなニーズがありました：
1. **リモート＆モバイル監視**：スマートフォンや iPad、外出先のノート PC から LAN / VPN 経由で長時間タスクを監視・操作したい。
2. **マルチモーダル＆画像添付**：クリップボード（`Cmd+V` / `Ctrl+V`）からの直接貼り付けやドラッグ＆ドロップで画像を瞬時に送信したい。
3. **ワークスペースファイルツリー**：右側のツリーから直感的にファイルを探し、ワンクリックで相対パスをコピーしてチャット内で `@path` 参照したい。
4. **安全な権限管理**：リスクのあるコマンド実行時にアラート音とともに承認カードを表示し、1クリック許可、永続許可、または Web ターミナルでの引き継ぎを行いたい。

**AngryUI は、CLI ターミナルと Web ブラウザの架け橋となる**、美しく高速で軽量（メモリ消費 **< 50MB**）な管理ハブです。

---

## 🚀 主な機能

### ⚡ リアルタイムストリーミング＆思考プロセス表示
- `agy --print --output-format stream-json` とダイレクト連携。
- WebSocket を通じて、思考プロセス（Thinking Accordion）、ツール実行カード、回答テキストをゼロ遅延でストリーミング。

### 🖼️ マルチモーダル＆クリップボード画像貼り付け
- **クリップボード直接貼り付け（`Cmd+V` / `Ctrl+V`）**：スクリーンショットをそのままチャット入力欄にペースト可能。
- **ドラッグ＆ドロップ**：ローカルの画像やドキュメントを直接ドロップしてアップロード。
- **全画面ライトボックス（Lightbox）**：チャット内の画像を拡大表示、ドキュメントの即時ダウンロードに対応。

### 🌐 5言語多言語対応（i18n）
- **English、简体中文、繁體中文、日本語、Español** をネイティブサポート。
- 初回アクセス時に**端末の言語を自動検出**して最適表示（デフォルトは English フォールバック）。
- サイドバー左下にミニマルな **"aA" ポップオーバー** を配置。

### 🛡️ デュアルセキュリティ＆リスクコントロール
- **セーフモード（デフォルト）**：未承認のコマンドやファイル書き込みを遮断し、Web Audio アラート音とともに**動的承認カード**を表示：
  - `Allow Once (1回のみ許可)`：現在のターンのみ実行
  - `Always Allow (常に許可)`：`settings.json` に永続登録
  - `Open WebTTY (Web端末を開く)`：組み込みターミナルで対話操作を引き継ぎ
- **自動承認モード（Auto-Approve）**：手放しで実行したいバッチタスクに最適。

### 📁 折りたたみ式ワークスペースファイルエクスプローラー
- セッションの作業ディレクトリに連動した右側のスライド式ファイルツリー。
- 階層ごとの遅延読み込み、ファイル種別アイコン、リアルタイム検索フィルター。
- **相対パスのワンクリックコピー (📋)** および **チャットへの直接挿入 (➕ `@path`)**。

### 💻 組み込み WebTTY ターミナルモーダル
- `node-pty` と `xterm.js`（WebGL アクセラレーション対応）によるフル機能ターミナル。
- スマートフォンやタブレットでも操作しやすいモバイル用仮想キー（`Esc`, `Tab`, `Ctrl+C`, 矢印キー）を完備。

### 🗂️ プロジェクト＆セッション管理
- SQLite インデックスおよび `brain/` の会話履歴と自動同期。
- 会話タイトルのカスタム変更、ワークスペースパス紐付け、アーカイブ絞り込み。
- **ゼロ遅延セッション切り替え（`sessionCache`）**：タブ内で履歴をメモリ保持し、一瞬で表示。

### 🔋 省電力＆ネットワーク節約モード
- `document.visibilityState` を検知し、タブが非表示・最小化された際に**バックグラウンドポーリングを自動一時停止**。

---

## 📦 クイックスタート

### 前提条件

- **Node.js** >= 18.0.0
- **Antigravity CLI** がインストールされていること（`agy` が `~/.local/bin/agy` または `$PATH` 内に存在）

### 1. インストール

```bash
# リポジトリのクローン
git clone https://github.com/your-username/angryui.git
cd angryui

# 依存パッケージのインストール
npm install
```

### 2. 開発モード（コード変更・デバッグ用）

```bash
# 開発サーバーの起動（Vite フロントエンド :5173 + バックエンド :3737）
npm run dev
```

ブラウザで [http://localhost:5173](http://localhost:5173) を開きます。

---

## 🚢 本番環境デプロイ

本番モードでは、Express バックエンドが圧縮された静的フロントエンド、REST API、WebSocket を**単一ポート `5173`** で一括配信します。

### オプション A：高可用性 PM2 デーモン（日常利用に推奨）

```bash
# ビルド＆バックグラウンド起動
npm run pm2:start

# ログのリアルタイム表示
npm run pm2:logs

# 再起動・停止
npm run pm2:restart
npm run pm2:stop

# PC起動時の自動起動設定
pm2 startup && pm2 save
```

### オプション B：Node 直接起動

```bash
# ビルド
npm run build

# デフォルトポート 5173 で起動
npm start

# ポートを指定して起動
npm start -- --port 8080
AGY_WEBUI_PORT=8080 npm start
```

---

## 🌐 リモート・VPN アクセス

AngryUI は、スマートフォン、iPad、ノート PC から **LAN（ローカルネットワーク）** または **VPN（Tailscale、WireGuard、ZeroTier、PgyVPN 等）** 経由で快適にアクセスできます：

```
┌────────────────────────────────────────────────────────┐
│                   リモート端末 (スマホ / iPad / PC)     │
│             ブラウザ: http://192.168.x.x:5173          │
│                 または: http://172.16.x.x:5173         │
└───────────────────────────▲────────────────────────────┘
                            │ LAN / VPN ネットワーク
┌───────────────────────────▼────────────────────────────┐
│                    ホストマシン (Mac / Linux / Win)     │
│               AngryUI サーバー (:5173)                 │
└────────────────────────────────────────────────────────┘
```

1. ホストマシンで `npm run pm2:start` を実行；
2. ホストマシンの LAN IP または VPN IP を確認；
3. リモート端末のブラウザで `http://<ホストIP>:5173` を開きます。

---

## 🛠️ 設定項目

環境変数または CLI 引数でカスタマイズが可能です：

| パラメータ / 環境変数 | CLI 引数 | デフォルト値 | 説明 |
|----------------------|----------|-------------|------|
| `AGY_WEBUI_PORT` | `-p, --port` | `5173` | サーバーポート |
| `AGY_WEBUI_HOST` | `--host` | `0.0.0.0` | バインドアドレス（`0.0.0.0` で LAN/VPN アクセス許可） |
| `AGY_WEBUI_TOKEN` | `-t, --token` | (なし) | API・WebSocket 保護用の認証トークン |
| `AGY_BIN` | - | `~/.local/bin/agy` | `agy` バイナリのパス |
| `AGY_HOME` | - | `~/.gemini/antigravity-cli` | Antigravity CLI のホームディレクトリ |

---

## 🧪 テスト

70 件の自動テスト（単体・契約・E2E）を完備：

```bash
# 全テストの実行
npm test

# ウォッチモード
npm run test:watch
```

---

## 📄 ライセンス

[MIT License](LICENSE) に基づくオープンソースソフトウェアです。
