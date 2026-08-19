# AngryUI — 现状审计

> 目标：系统化梳理 AngryUI 当前实现中**已经做对**的部分与**不完善**的部分，按严重度分级。本文不涉及未来改进方案（详见 `angryui-roadmap.md`）。
>
> 调研时间：2026-08-18  
> 范围：`/Users/jason/myprojects/angryui`（React 19 + TypeScript + Vite + Express + node-pty + better-sqlite3）  
> 评估维度：远程/跨网访问、移动端体验、安全基线、可靠性与运维、开发者体验、可访问性与性能打磨

---

## 0. TL;DR（严重度一览）

| 维度 | CRITICAL | HIGH | MEDIUM | LOW | 合计 |
|---|---:|---:|---:|---:|---:|
| A. 远程/跨网访问 | 2 | 3 | 2 | 1 | **8** |
| B. 移动/触屏 | 0 | 0 | 1 | 4 | **5** |
| C. 安全基线 | 1 | 1 | 2 | 2 | **6** |
| D. 可靠性与运维 | 0 | 2 | 2 | 3 | **7** |
| E. 开发者体验 | 0 | 0 | 3 | 1 | **4** |
| F. 可访问性与性能 | 0 | 0 | 1 | 3 | **4** |
| **合计** | **3** | **6** | **11** | **14** | **34** |

**最严重 3 项（必须优先解决）**

1. 服务端 `dangerouslySkipPermissions` 标志完全由客户端控制（`server/ws/handlers/chatHandler.ts:97-104`），客户端或 MITM 可以绕过所有授权检查 → 见 C-01
2. 客户端没有携带 token（`src/lib/api.ts` 与 `src/hooks/useWebSocket.ts` 未携带 token），即使服务器配置了 `--token`，API 与 WS 也处于未授权状态 → 见 A-02
3. 服务端完全无 HTTPS/TLS（`server/index.ts:71`），所有流量明文传输 → 见 A-01

**最影响"远程组网"场景的 6 项 HIGH**

1. CORS 全开（`server/index.ts:17`，`app.use(cors())` 无任何参数）
2. 无任何 rate limit（`server/` 内无限流机制）
3. JSON body 上限 50MB，过宽（`server/index.ts:18-19`）
4. WS 重连固定 2 秒，无指数退避（`src/hooks/useWebSocket.ts:32`）
5. WS 无 ping/pong 心跳，长连接可能假死
6. `settings.json` 明文存放在 `agyHome`，且"始终允许"会持久化规则 → 安全敏感

---

## 1. 已经做对的部分（保留，不要回退）

这一节列出当前实现中**已经合格**的实践，roadmap 阶段不应将其重写或弱化。

### 远程/网络
- ✅ 默认 `0.0.0.0` 绑定且 host 可配置（`server/config.ts:102-105`）
- ✅ WS 升级时校验 URL 前缀与 token（`server/ws/wsServer.ts:15-19`）
- ✅ 支持 LAN/VPN/PgyVPN/Tailscale/WireGuard/ZeroTier 多种远程方式（README 文档化）

### 移动端与交互
- ✅ `index.html:5` 已设置 viewport meta
- ✅ `<=768px` 自动折叠 sidebar + 移动端覆盖式定位（`src/context/SidebarContext.tsx:15-18`，`src/components/sidebar/Sidebar.tsx:66-68`）
- ✅ WebTTY 模态内含虚拟键（Esc/Tab/Ctrl+C/方向键/Enter，见 `src/components/tui/WebTTYModal.tsx:6-15`）
- ✅ 自动跟随 `prefers-color-scheme`（`tailwind.config.js:4`，`src/index.css:28-49`）
- ✅ 剪贴板图片粘贴与拖拽多文件上传（`src/components/chat/ChatInput.tsx:45-75` 支持 `onPaste` 与 `items`/`files` 兜底）

### 安全
- ✅ 文件树 API 做了路径遍历防护（`server/services/fileService.ts:26-28`）
- ✅ 文本消毒剥离 ANSI 与控制字符（`src/lib/textSanitizer.ts:5-13`）
- ✅ Turn 超时 5 分钟（`server/ws/handlers/chatHandler.ts:21`），不会无限挂起

### 可靠性与运维
- ✅ PM2 ecosystem 配置存在（`ecosystem.config.cjs`）
- ✅ SIGINT/SIGTERM 优雅退出（`server/index.ts:76-84`），含 5 秒强退兜底
- ✅ 公开健康检查接口已就绪（`server/index.ts:22-24` 提供 `/api/health`）

### 开发者体验
- ✅ `npm run dev` 并行启动 server + vite，TS watch 模式（`package.json:10-12`）
- ✅ TypeScript `strict: true`（`tsconfig.json:6`）
- ✅ 70 个测试分布在 14 个 server 测试 + 7 个 client 测试 + contract 测试
- ✅ 5 语言 i18n（en/zh-CN/zh-TW/ja/es，`src/i18n/translations.ts:10-16`）

---

## 2. 不完善之处（按维度，按严重度降序）

### A. 远程 / 跨网访问

#### [CRITICAL] A-01 服务端无任何 TLS/HTTPS
- **证据**：`server/index.ts:71` 使用 `http.createServer` 绑定，仓库内无任何 `https`/`cert`/`tls` 关键字命中。
- **隐患**：HTTP 下 token、对话内容、文件树全部明文，跨网段传输无任何加密。配合 A-02 的客户端不带 token，C-01 的客户端控制危险命令——任意在网络上做 MITM 的攻击者都能同时达成「未授权访问」+「远程任意命令执行」。
- **方向**：
  - 提供 **A 方案**（推荐）：Express 原生支持 HTTPS，配置文件增加 `--ssl-cert` / `--ssl-key`，或启动时自签
  - **B 方案**：在 README 强制建议 nginx/Caddy 反代 + Let's Encrypt，并提供最小化 Caddyfile / nginx.conf 模板

#### [CRITICAL] A-02 服务端接收 Bearer token，但客户端从未发送
- **证据**：服务端 `server/utils/tokens.ts` 提供 Bearer 校验中间件，但 `src/lib/api.ts` 与 `src/hooks/useWebSocket.ts` 无任何 token 逻辑——客户端 fetch 与 WS upgrade 都没有附带 `Authorization` 头。
- **隐患**：即便 `--token` 已经配置，对 API 与 WS 的访问依然是匿名的。任何能访问到端口的人都直接接管。AngryUI 文档暗示要远程访问，但实际攻击面比 0-auth 还要糟糕——服务端有"假装的防御"，让人误以为有保护。
- **方向**：第一次加载时让用户输入 token → 存 `sessionStorage` → 跨标签同步通过 `BroadcastChannel` → 失效时无感知刷新引导。WS 握手中通过 subprotocol 或 query param 携带。

#### [HIGH] A-03 CORS 完全开放
- **证据**：`server/index.ts:17` 写的是 `app.use(cors())`，未传任何 origin 限制。
- **隐患**：配合 A-02 没有任何 token 校验，任何网页里塞一个 `fetch` 都能直接打到这台服务器上的 API + WS（虽然是 ws 不是 http，但配合 origin 漏洞思路）。另外浏览器默认情况下 ws 握手没法做 CORS，但 express 普通 API 完全开放，意味着即便接了 token，恶意站点仍能在用户登录态下跨站调用。
- **方向**：默认允许同源；如允许跨站，需要白名单 + 强制 `AGY_WEBUI_CORS_ORIGINS`。

#### [HIGH] A-04 全局无任何 rate limit
- **证据**：`server/` 内无任何限流逻辑；`package.json` 也未引入 `express-rate-limit`。
- **隐患**：远程暴露后，token 暴力枚举、文件树大规模递归探测、WS 重连洪水都会触发 OOM 或 sqlite lock contention。
- **方向**：
  - 关键路由：登录 / send-message / upload 加桶（滑动窗口）
  - WS：每 IP 每分钟最多建立 N 个连接

#### [HIGH] A-05 express.json limit 50MB 过宽
- **证据**：`server/index.ts:18-19` 给 JSON 与 urlencoded 都设了 `'50mb'`。
- **隐患**：普通 chat 消息几 KB，多模态图片走 multipart 上传而非 JSON body。把 JSON 上限放到 50MB 等于送 OOM 武器给外部。
- **方向**：JSON 默认 256KB–1MB，文件上传走独立 multipart endpoint 并限定单文件大小与并发上传数。

#### [MEDIUM] A-06 无内置零配置 tunnel
- **证据**：README "Remote & VPN Access" 段落只讲 LAN 手动/Tailscale/ZeroTier，无任何 `bore`/`cloudflared`/`ngrok` 一键脚本或集成。
- **隐患**：典型场景"在火车上用手机连家里 dev box"需要用户自己懂 SSH 反向隧道——这是 **用户远程组网体验不佳** 的最大单一原因。
- **方向**：
  - 加 `npm run tunnel:cloudflare` 调用 `cloudflared` CLI（如可用）
  - 加 `npm run tunnel:lan` 打印 LAN QR code 给手机扫
  - 在 WebTTY 顶部加一个 "开启临时隧道" 按钮，前提用户已经装了 cloudflared

#### [MEDIUM] A-07 WS 缺少 ping/pong 与延迟监控
- **证据**：`src/hooks/useWebSocket.ts` 与 `server/ws/wsServer.ts` 都没有 `ping`/`pong` 或 `heartbeat` 关键字。
- **隐患**：弱网下连接"假活"，手机锁屏后 NAT 老化，对端不知何时已断，消息积压或丢失。
- **方向**：服务端 30 秒 `ws.ping`、客户端实现 `ws.on('pong')` + 失活超时自动重连。

#### [LOW] A-08 无任何 reconnect 状态可视化
- **证据**：reconnect 逻辑在 `useWebSocket.ts:32`，但 UI 上看不到"重连中第 N 次"的指示。
- **方向**：在 `<title>` 与状态栏暴露重连次数与下次重试时刻。

---

### B. 移动 / 触屏体验

#### [MEDIUM] B-01 无 PWA / service worker
- **证据**：`public/`、`index.html`、`src/` 内均无 `manifest.json`、`serviceWorker`、`@vite/plugin-pwa` 痕迹。
- **隐患**：无法"添加到主屏幕"全屏运行；弱网下首次加载卡死；没有离线缓存消息/草稿。
- **方向**：引入 `vite-plugin-pwa` + Workbox，离线缓存 app shell + 最近一次会话。

#### [LOW] B-02 dark mode 无手动切换
- **证据**：`tailwind.config.js:4` 是 `darkMode: 'media'`，没有持久化用户的覆盖选择。
- **方向**：暴露两个图标（sun/moon），写 `localStorage`。

#### [LOW] B-03 WebTTY 虚拟键位置/样式 for 大屏手机可优化
- **证据**：`src/components/tui/WebTTYModal.tsx:6-15` 已经有 `VIRTUAL_KEYS`，但在实际真机上（iPhone 15）方向键面积偏小、贴近屏幕底，易误触 home indicator。
- **方向**：触摸目标 ≥44pt；新增 `[/]/?` 等常见交互键。

#### [LOW] B-04 移动端长消息流滚动性能与回滚
- **证据**：chat message 列表渲染逻辑未做虚拟化（`ChatMessageList.tsx` 直接 map 节点），长上下文下手机滚动可能掉帧。
- **方向**：用 `react-virtuoso` 或 `react-window` 虚拟化消息列表。

#### [LOW] B-05 移动端缺少"打开摄像头实时拍"
- **证据**：文件输入框未指定 capture 属性。
- **方向**：`<input type="file" accept="image/*" capture="environment">` + 一个明显的相机入口。

---

### C. 安全基线

#### [CRITICAL] C-01 `dangerouslySkipPermissions` 完全由客户端控制
- **证据**：`src/hooks/useConversation.ts:183-194` 在收到 `permission_required` 后弹授权卡，但 `server/ws/handlers/chatHandler.ts:97-104` 接受客户端 payload 中的 `dangerouslySkipPermissions` 并直接传给 agy 子进程。服务端没有"环境变量/配置开关"决定是否允许这个标志。
- **隐患**：浏览器扩展、恶意脚本、被劫持的 ws 连接都能直接发 `dangerouslySkipPermissions: true` 让 agent 跳过所有授权，等于"用户在远程开了 dev box，任何路过网络的人都能拿到 bash"。
- **方向**：
  - 删掉 client-side 的字段
  - 服务端只读环境变量 `AGY_WEBUI_ALLOW_SKIP_PERMISSIONS`，且必须带 token 才能设置
  - **必须**：增加测试 `tests/server/chatHandler.dangerous-bypass.test.ts` 保证该字段不会再回归

#### [HIGH] C-02 `settings.json` 明文存敏感配置
- **证据**：`server/services/settingsService.ts:22-27` 写入 `getConfig().agyHome`（默认 `~/.gemini/antigravity-cli/settings.json`）。
- **隐患**："Always Allow" 会持久化命令/路径白名单。若机器被入侵，攻击者能拿到所有长期授权规则。
- **方向**：
  - 增加文档说明
  - 加密可选：用 OS keychain（macOS Keychain / Windows DPAPI / Linux libsecret）+ service-set master key
  - MVP 阶段至少加文件权限 `chmod 600`

#### [MEDIUM] C-03 工具调用 command 字段缺乏二次校验
- **证据**：`server/services/turnRunner.ts:110-117` 解析 JSON 但仅消毒文本显示，未对命令本身的"是否真的要被授权"做语义校验。
- **隐患**：理论上 agent 子进程传上来的命令如果被劫持，仍会被无脑展示给用户授权——但这是 agent 内部问题，UI 端能做的只有 UI 防护。
- **方向**：把"白名单/黑名单 patterns"评估可视化在授权卡里（高亮出危险 token），提示用户"这条命令里有 `curl ... | sh`，请谨慎"。

#### [MEDIUM] C-04 SQLite 直接以 `readonly: true` 打开
- **证据**：`server/db/sqliteClient.ts:29` 用 readonly 模式，写操作走 `openConversationDbWrite()` 单独开 connection。
- **隐患**：缺乏 schema version 校验——如果 `agy` 升级改了表结构，AngryUI 没迁移就会读到 partial data；缺乏 backup 与 lock 探测。
- **方向**：
  - 自建 `brain` schema 与 `agy_conversations` schema 分离
  - 增加 `schema_version` PRAGMA 检查
  - 启动时自动 dump 到 `~/.gemini/antigravity-cli/backups/yyyymm.sqlite`

#### [LOW] C-05 输入消毒已实现但散落
- **证据**：`src/lib/textSanitizer.ts` + `server/utils/textSanitizer.ts`（两份）。
- **方向**：抽到共享包 `@angryui/shared-utils`，防两端规则漂移。

#### [LOW] C-06 错误信息可能泄漏内部细节
- **证据**：grep 结果显示异常通过 `console.error(e)` 简单处理，未做脱敏。
- **方向**：前端展示固定文案，console 仅保留原始堆栈以供排查。

---

### D. 可靠性与运维

#### [HIGH] D-01 WS 重连固定 2 秒、无指数退避
- **证据**：`src/hooks/useWebSocket.ts:32` `setTimeout(connect, 2000)`。
- **隐患**：服务挂了 30 分钟，前端会持续每 2 秒撞端口；间歇性故障时永远不会"等一会儿再试"。
- **方向**：`delay = min(2^n * 1000 + jitter, 30000)`；提供"立即重连"按钮；状态指示变化。

#### [HIGH] D-02 无 WS ping/pong（同 A-07）
- **隐患**：见 A-07。

#### [MEDIUM] D-03 SQLite 缺乏 schema 校验与备份
- 见 C-04。

#### [MEDIUM] D-04 没有 graceful 杀掉 node-pty 子进程
- **证据**：`server/index.ts:76-84` 优雅退出仅关 HTTP server，没看到遍历 `ptyManager` 子进程并发送 SIGTERM/SIGKILL 的代码。
- **隐患**：用户更新/重启时遗留 `shell`/`bash`/`node` 子进程持续运行。
- **方向**：`process.on('SIGTERM')` 时先 `ptyManager.killAll()`，超时再 process exit。

#### [LOW] D-05 日志只有 console.log
- **证据**：`grep -r "console\." server/`。
- **方向**：引入 `pino`，结构化输出到 `~/.gemini/antigravity-cli/logs/{date}.log`，敏感字段（token、命令内容）脱敏。

#### [LOW] D-06 PM2 ecosystem 可加强
- **证据**：`ecosystem.config.cjs` 有 `autorestart`、`max_memory_restart`，但没有 `kill_timeout`、没有 `log_file`、`out_file` 配置。
- **方向**：补 `kill_timeout: 10000` 配合 D-04 的子进程清理。

#### [LOW] D-07 系统依赖（如 node-pty prebuilds）失败兜底不足
- **证据**：postinstall `chmod +x` 静默吞错（`|| true`）。
- **方向**：失败时明确提示 "请安装 build-essential / libssl-dev"。

---

### E. 开发者体验

#### [MEDIUM] E-01 WS 协议无契约测试
- **证据**：`tests/contract/` 仅有基础校验，缺少 ws/auth/dangerous 命令相关契约测试。
- **隐患**：协议演进时极易破坏向后兼容（agy 升级一个字段名，UI 就崩）。
- **方向**：
  - 把 `server/ws/protocol.ts` 显式定义，加 zod schema
  - 给每个消息类型加 round-trip 序列化测试
  - 给 chatHandler 加 "client tries to inject dangerouslySkipPermissions" 回归测试

#### [MEDIUM] E-02 危险命令拦截缺测试
- **证据**：测试目录未见 dangerously-xxx / bypass / permission 相关自动化用例。
- **方向**：补 C-01 描述的回归测试 + 一个 e2e：登录 → 用 bad client payload → 期望服务端拒绝并落审计日志。

#### [MEDIUM] E-03 后端日志、错误码、可观测性弱
- **方向**：
  - 给所有错误返回规范化 `{ code, message, requestId }`
  - requestId 通过 `cls-hooked` 串联一次请求的所有日志

#### [LOW] E-04 缺 Storybook
- **方向**：可选。组件库化前不必上，避免过早抽象。

---

### F. 可访问性与性能打磨

#### [MEDIUM] F-01 缺 ARIA 标签与键盘可达性
- **证据**：grep `aria-` 在 `src/components` 命中率极低。
- **方向**：sidebar、tab、模态、虚拟键加 `aria-*`；chat 输入加 live region 公告新消息。

#### [LOW] F-02 无骨架屏
- **方向**：会话加载/历史分页时加 skeleton。

#### [LOW] F-03 后台节流只声明不显式
- **证据**：README 80-82 行提到 background tab 暂停 polling；要确认实际是否实现 `document.visibilityState`。
- **方向**：显式加一个 `useBatterySaver()` hook。

#### [LOW] F-04 bundle 体积未做预算
- **证据**：vite.config.ts 没看到 manual chunks。
- **方向**：用 `vite-bundle-visualizer`，设置 main chunk 警告 500KB。

---

## 3. 文件清单（审计覆盖范围）

### Server（全部阅读）
- `server/index.ts` · `server/config.ts` · `server/utils/tokens.ts`
- `server/ws/wsServer.ts` · `server/ws/handlers/chatHandler.ts` · `server/ws/handlers/tuiHandler.ts`
- `server/ws/conversationHub.ts`
- `server/db/sqliteClient.ts` · `server/db/conversationIndex.ts`
- `server/services/turnRunner.ts` · `server/services/fileService.ts` · `server/services/ptyManager.ts`
- `server/services/settingsService.ts` · `server/services/discoveryService.ts`
- `server/utils/backup.ts`

### Client（重点）
- `src/App.tsx` · `src/hooks/useWebSocket.ts` · `src/hooks/useConversation.ts`
- `src/components/tui/WebTTYModal.tsx` · `src/components/chat/ChatInput.tsx` · `src/components/sidebar/Sidebar.tsx`
- `src/context/SidebarContext.tsx`
- `src/lib/api.ts` · `src/lib/textSanitizer.ts`
- `src/i18n/translations.ts`

### 配置
- `vite.config.ts` · `tsconfig.json` · `tsconfig.server.json`
- `tailwind.config.js` · `components.json`
- `ecosystem.config.cjs` · `package.json`

### 测试
- `tests/server/`（14 个用例文件） · `tests/client/`（7 个） · `tests/contract/`

---

## 4. 严重度定义

| 级别 | 含义 |
|---|---|
| **CRITICAL** | 暴露在公网后**远程代码执行 / 数据泄露**风险，或核心主流程功能完全不可用。必须 1 周内修复。 |
| **HIGH** | 显著影响远程/移动/可靠性，不修则会让"开发者不在机器前"的承诺打折扣。1 月内修复。 |
| **MEDIUM** | 显著体验或可维护性差距，但不影响关键路径。本季度排期修复。 |
| **LOW** | nice-to-have。一年内看排期。 |

---

## 5. 推荐立即处理的 6 项（按 ROI 排序）

1. **服务端去掉 `dangerouslySkipPermissions` 客户端控制 + 加锁** （C-01）  
   改动量 ≈ 30 行代码 + 1 个测试；安全收益最大。

2. **客户端发送 token + 服务端严格校验** （A-02）  
   改动量 ≈ 80 行代码（login UI + token store + fetch/WS interceptor + 测试）。这是远程访问的入场券。

3. **WS 重连退避 + ping/pong** （D-01, D-02, A-07）  
   改动量 ≈ 60 行 + 测试；远程体验立刻改善。

4. **请求大小、CORS、rate limit 三件套** （A-03, A-04, A-05）  
   改动量 ≈ 100 行。

5. **提供 Caddy/nginx 反代 + Let's Encrypt 模板** （A-01 部分缓解）  
   0 代码，纯文档；远程访问必须项。

6. **`server/ws/protocol.ts` 显式化 + 契约测试 + 危险命令回归测试** （E-01, E-02）  
   改动量 ≈ 一天；为后续 5+ 项 roadmap 工作打底。

---

文档结束。下一步见 `docs/angryui-roadmap.md` 中的改进方案与实施步骤。
