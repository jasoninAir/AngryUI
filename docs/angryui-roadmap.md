# 🔥 AngryUI — 竞品对比与产品演进路线图 (Roadmap 2026)

> **文档定位与目标：**
> 1. 明确 AngryUI 面向 **Solo Developer（独立开发者）** 的核心定位；
> 2. 梳理与主流 AI Coding / Agent WebUI 竞品的横向对比与差异化；
> 3. 确立 Antigravity 专属的深度生产力特性（**Subagents 拓扑、Artifacts 抽屉、Skills/Rules 热载开关、多语言文本代码预览、MCP 状态巡检、临时只读分享**）；
> 4. 给出清晰的**优先级矩阵（Priority Matrix）**与**分阶段开发计划 TODO Checklist**。
>
> 调研与更新时间：2026-08-19  
> 适用范围：Google Antigravity CLI（`agy`）的远程 Web 伴侣。

---

## 0. 一句话定位与核心哲学

> **AngryUI 是专为「一台宿主开发机跑 `agy`、开发者异地多端远程访问」的 Solo Developer 打造的轻量（<50MB RAM）、强终端直达（WebTTY）、强授权风控与专属 Agent 协同沉浸消费的 Web 伴侣。**

### 核心设计原则
1. **Solo Dev First**：专为单人开发体验极致优化，拒绝沉重的多租户/RBAC/企业级鉴权负担，采用轻量级「临时只读分享链接」满足外部 Review 与展示需求。
2. **Host-First, UI as Companion**：Antigravity CLI 作为宿主引擎，WebUI 保持极轻量，专注于**状态感知、流式可视化、危险拦截与交互增强**，不做多余的内部重型执行引擎（如在 WebUI 内跑 MCP 引擎或 RAG 向量库）。
3. **No Offline Staging Complexity**：保持直连通信与心跳韧性，放弃高复杂度的离线排队暂存与合并机制，确保每一次交互都实时可靠。
4. **Antigravity Native**：深度结合 Antigravity 特性生态（Subagents、Artifacts、Skills、Rules、Thinking Process），提供竞品无法复制的原生深度体验。

---

## 1. 竞品图谱（2026 市场格局）

| 项目 | 定位 | ⭐ | License | 技术栈 | 对 AngryUI 的参考与启示 |
|---|---|---:|---|---|---|
| **siteboon/claudecodeui** | Claude Code 的 mobile/web 伴侣 | 13.3k | AGPL-3.0 | React + Node | **直接对标**。Mobile-first 触控、状态感知、插件化思考 |
| **sugyan/claude-code-webui** | Claude Code 极简 Web 包装 | 1.1k | MIT | React + Node | MIT 阵营，极简轻量，单文件结构清晰 |
| **earendil-works/pi (pi-mono)** | 模块化 TUI Coding Agent | 93k | MIT | TS Monorepo | Session 状态模型与 Tool 生命周期设计值得参考 |
| **open-webui/open-webui** | 通用 LLM/Ollama 聊天平台 | 149k | AGPL+商业 | Python + Svelte | PWA、界面交互成熟，但架构与部署过重 |
| **block/goose** | 桌面端通用 AI Agent | 53k | Apache-2.0 | Rust + Tauri | MCP 状态探测与 Token 深度集成的思路 |
| **OpenHands/OpenHands** | 自主全栈 Dev Agent | 84k | MIT | Python + Docker | 沙箱隔离与文件变更 Diff 展示范式 |
| **charmbracelet/crush** | 极客风终端 Agent | 27k | 自有 | Go + Bubble Tea | 终端美学与键盘流操作效率 |
| **stackblitz/bolt.new** | 浏览器内全栈 WebContainer | 16.5k | MIT | WebContainers | 侧边预览与代码检查器的交互流畅度 |

---

## 2. 功能矩阵（AngryUI vs 竞品对位）

> 符号说明：✓ 已实现且质量过关 · △ 部分实现/粗糙 · ✗ 未实现 · 🎯 规划中核心特性

| 维度 | AngryUI 当前 | claudecodeui | claude-code-webui | Open WebUI | AngryUI 目标演进 |
|---|---|---|---|---|---|
| **开源协议** | **MIT (商业友好)** | AGPL-3.0 | MIT | AGPL | **MIT (长期保持)** |
| **内存占用** | **< 50MB (极轻量)** | ~80MB | ~40MB | > 300MB | **< 50MB** |
| **响应式 / Mobile** | ✓ (基础响应式) | ✓ (Mobile-first) | △ | ✓ (PWA) | ✓ (PWA 推荐 + 44pt 触控) |
| **PWA 支持** | ✗ | ✓ | ✗ | ✓ | 🎯 **推荐模式 (App Shell + Push)** |
| **安全鉴权闭环** | △ (服务端有，客户端未发) | ✓ | ✓ | ✓ (RBAC/SSO) | 🎯 **Bearer Token / 登录态闭环** |
| **危险命令拦截与语义** | ✓ (高保真弹窗/卡片) | △ | △ | △ | 🎯 **语义危险高亮 + 临时白名单** |
| **终端直达 (WebTTY)** | ✓ (xterm.js + node-pty) | △ | △ | ✗ | 🎯 **触屏手势 + 快捷键条增强** |
| **文件树与代码审查** | ✓ (文件树列表) | ✓ | ✓ | ✓ | 🎯 **多语言文档/代码预览器 (json/md/py等)** |
| **Subagents 协同拓扑** | ✗ | ✗ | ✗ | ✗ | 🎯 **Antigravity 独家拓扑可视化** |
| **Artifacts 专属渲染** | △ (基础 Markdown) | ✗ | ✗ | △ | 🎯 **专属抽屉 (Carousel/Mermaid/Diff)** |
| **Skills & Rules 管理** | ✗ | ✗ | ✗ | ✗ | 🎯 **Web 端热载与一键开关** |
| **MCP 生态集成** | ✗ | △ | △ | ✓ | 🎯 **MCP 状态巡检与工具能力卡** |
| **多用户 / 协作策略** | ✗ | ✗ | ✗ | ✓ (复杂 RBAC) | 🎯 **轻量临时只读分享链接 (TTL Token)** |
| **i18n 多语言** | ✓ (5 语言即时切换) | △ | ✗ | ✓ | ✓ (持续维护) |

---

## 3. 表级配置（Table Stakes — 远程访问基础门槛）

> 确保远程与异地组网访问在安全性、韧性与交互上达到现代基础设施标准。

1. **安全与鉴权闭环**：
   - 服务端锁死危险权限跳过（禁止未授权客户端传入 `dangerouslySkipPermissions`）；
   - 客户端 Fetch 拦截器与 WebSocket 握手全链路携带 Bearer Token；
   - 首次访问弹出登录授权弹窗，支持 Token 记住与安全注销。
2. **网络韧性与心跳**：
   - WebSocket 指数退避重连（Exponential Backoff with Jitter，最大上限 30s）；
   - 服务端/客户端双向 Ping/Pong 心跳（25s 间隔，60s 超时主动断连与重置）；
   - 标签页激活（`visibilitychange`）瞬时触发连接保活检测。
3. **API 安全防护**：
   - CORS 精确白名单控制（`AGY_WEBUI_CORS_ORIGINS`）；
   - 关键接口（登录、发消息、上传）增加滑动窗口 Rate Limiting；
   - 统一 JSON 错误结构与全链路 `X-Request-Id` 追踪。
4. **HTTPS / 反向代理指导**：
   - 内置安全警告与生产反代模板（Caddy / Nginx / Cloudflare Tunnel / Tailscale Funnel）。

---

## 4. 核心差异化与 Antigravity 专属特性

### 4.1 Subagents 协同拓扑可视化 (Subagent Topology & Trace Visualizer)
- **背景**：Antigravity 支持通过 `invoke_subagent` 派发并行或专业子任务（如 `research`, `code-reviewer`, `test-engineer`, `security-auditor` 等）。
- **设计**：
  - **拓扑关系树**：直观呈现 Parent Agent 与各 Subagent 的层级调用链路；
  - **实时状态徽标**：展示各子 Agent 的生命周期（`running`, `idle`, `waiting_for_input`, `waiting_for_dependents`, `canceling`, `errored`）；
  - **通信流追踪**：点击任一 Subagent 节点即可在抽屉中查看其独立交互日志与 Message 往返，无需在主窗口中混杂大量上下文。

### 4.2 Artifacts 专属渲染抽屉 (Artifacts Dedicated Drawer & Inspector)
- **背景**：Antigravity 产出高价值结构化交付物（架构方案、测试报告、多步幻灯片、Diff、Mermaid 图表），混在普通对话流中影响阅读。
- **设计**：
  - 顶部/侧边独立 **Artifacts 专属抽屉**，自动检测会话中生成的 Artifact 文件；
  - **多 Slide Carousel 幻灯片**：原生支持 `<!-- slide -->` 切片交互与无缝切换；
  - **Mermaid 流程图/架构图渲染**：支持缩放、全屏与 SVG 导出；
  - **Code Diff 高保真对比**：支持 Split / Unified 视图与一键应用/复制。

### 4.3 Skills & Rules 热载与开关管理 (Skills & Rules Manager)
- **背景**：Antigravity 拥有丰富的全局与项目级自定义（`~/.gemini/antigravity-cli/skills/`, `.gemini/config/plugins/`, `RULE[...]`）。
- **设计**：
  - **可视化清单**：扫描并以卡片形式展示已发现的 Skills（含名称、描述、Trigger 条件、脚本目录）与 Rules；
  - **一键开关（Toggle Switch）**：支持在 UI 上临时禁用/启用某个 Skill 或规则（通过会话环境变量或 override 机制透传）；
  - **热载感知（Hot Reload）**：监测配置文件变动，一键刷新可用 Skills 清单，无需重启整个服务。

### 4.4 文本文档与代码预览/检查器 (Text & Code Inspector)
- **背景**：开发者在手机或远程查看 Agent 读写的文件（如 `.json`, `.md`, `.py`, `.ts`, `.yaml`, `.sh`）时，需要即时审查其内容与语法。
- **设计**：
  - 在文件树抽屉与消息引用卡片中集成 **轻量代码预览器（Code Inspector Modal / Drawer）**；
  - 支持常用语言高亮、行号显示、行范围高亮（`#L10-L30` 快速定位）；
  - 提供 **一键复制全文**、**插入聊天引用（`@filename#L..`）** 与 **下载原始文件**。

### 4.5 临时只读分享链接 (Read-Only Share Links with TTL)
- **背景**：Solo Dev 偶尔需要将当前任务排查进度或 Agent 编码方案分享给同事/Reviewer 查看，但不需要引入复杂的多用户注册与 RBAC。
- **设计**：
  - Session 菜单提供「生成只读分享链接」；
  - 服务端签发轻量只读 Share Token，支持设置有效期（1 小时 / 24 小时 / 7 天 / 永久）；
  - 访问者仅能查看该特定会话的历史 Transcript、Artifacts、文件树快照，**完全禁用发送消息、执行命令与工具授权接口**。

### 4.6 MCP 状态巡检与工具能力卡 (MCP Inspector)
- **定位原则**：**不做 WebUI 内的 MCP 执行引擎，只做状态巡检与能力展示。**
- **设计**：
  - Antigravity 作为 Host 负责跑 MCP Server；
  - WebUI 读取当前环境配置的 MCP Servers（Eager / Lazy 状态、工具清单、Prompt 模板、Resources 列表）；
  - 提供 MCP 健康检查探测指示灯与工具调用统计视图。

### 4.7 PWA 建议模式与移动端触控优化
- **README 增加 PWA 推荐指南**：指导用户在 iOS Safari（添加到主屏幕）/ Android Chrome（安装应用）上一键安装，获得原生 App 级沉浸全屏体验；
- **Web App Manifest + App Shell 缓存**：秒开界面，静态资源本地持久化；
- **锁屏 Push 通知（Web Push）**：当 Agent 触发危险命令审批或长时间任务完成时，向移动端发送系统级推送通知；
- **44pt 移动端触控优化**：WebTTY 虚拟键垫尺寸调整，长按快捷操作，iOS 剪贴板图片粘贴深度兼容。

---

## 5. 避坑指南（明确不做与砍掉的过度设计）

| 模式 / 想法 | 为什么明确不做 / 放弃 | 替代方案 |
|---|---|---|
| **离线暂存排队 (Offline Staging & Replay)** | ❌ 单人控制 CLI Agent 时，离线产生指令排队容易引发执行时序错乱与上下文分裂，复杂度极高且无实质价值。 | **放弃离线排队**。采用断线重连指数退避 + 实时心跳保活，保持直连架构。 |
| **WebUI 内部 MCP 执行引擎** | ❌ 在 Web 端或 Express 内自建 MCP 客户端运行时与 Antigravity CLI 自身的 MCP 体系冲突且极其臃肿。 | **只做 MCP Inspector**。宿主由 `agy` 负责，WebUI 仅作状态与工具展示。 |
| **全套 OAuth/LDAP/企业级 RBAC** | ❌ 与 Solo Developer 定位冲突，引入巨大的用户体系与数据库维护成本。 | **临时只读分享链接 (TTL Token)**。轻量、灵活、开箱即用。 |
| **9 种向量库 RAG 平台** | ❌ AngryUI 是 CLI Agent 伴侣，不是通用知识库管理平台。 | Antigravity 自身拥有代码检索与文件索引能力，WebUI 保持极简。 |
| **AGPL 协议绑定** | ❌ 阻碍开发者自由定制与企业内部集成。 | **坚决保持 MIT 协议**。 |
| **浏览器内全栈云沙箱** | ❌ 偏离「管理本地/远程真实机器上的 `agy`」核心初衷。 | 深耕 WebTTY (xterm.js + node-pty) 与本地工作区文件树。 |

---

## 6. 优先级矩阵 (Priority Matrix)

```
高价值 (High Value)
   ▲
   │  [P0-1] 安全授权锁死       [P1-1] PWA 推荐与 Shell 缓存     [P2-1] Subagents 拓扑可视化
   │  [P0-2] Token 鉴权闭环     [P1-4] 文本代码预览 (json/md/py)  [P2-2] Artifacts 专属渲染抽屉
   │  [P0-4] WS 指数退避与心跳  [P1-3] 危险命令高亮 & 临时白名单  [P2-3] Skills/Rules 热载与开关
   │                            [P1-5] 锁屏 Web Push 授权通知    [P2-4] 临时只读分享链接
   │
   │  [P0-5] CORS & RateLimit   [P1-2] 一键临时公网隧道 (Cloudflare) [P2-5] MCP 状态巡检
   │  [P0-7] Health & RequestId [P1-6] 44pt 移动虚拟键 & 触控优化    [P3-1] 文档与性能预算
   │
───┼───────────────────────────────────────────────────────────────────────────────►
   │                                                                      开发成本 (Effort)
   ▼  低成本 (Low Effort)                                                 高成本 (High Effort)
```

---

## 7. 分阶段开发计划与 TODO 清单

### Phase 1 — **P0: Trust & Resilience Baseline**（已全部完成 ✅）
> **目标**：彻底封堵安全隐患，打牢网络连接与接口契约基线。

- [x] **TODO P0-1: 权限下发安全收紧**
  - 服务端移除客户端传入的 `dangerouslySkipPermissions` 控制权；
  - 仅在服务器启动参数显式配置 `--allow-skip-permissions` 时生效；
  - 编写 E2E 测试验证未授权请求无法越权执行命令。
- [x] **TODO P0-2: 全链路 Token 鉴权闭环**
  - 新增 `/api/auth/status` 与 `/api/auth/login` 校验端点与前端现代化登录态卡片；
  - 前端 API Fetch 拦截器注入 `Authorization: Bearer <token>` 与 401 自动失效处理；
  - WebSocket 握手增加 Token 校验与失效主动引导；
  - 编写多标签页 Token 共享与鉴权测试。
- [x] **TODO P0-3: WebSocket 连接退避与心跳韧性**
  - 重构 `useWebSocket`：加入指数退避（Exponential Backoff with Jitter，最大 30s）；
  - 服务端与客户端双向 Ping/Pong（25s 周期，60s 超时处理）；
  - UI 状态条增加网络重连中/重试次数状态提示与 `visibilitychange` 恢复检测。
- [x] **TODO P0-4: 接口防护与规范化**
  - 配置 CORS 精确白名单中间件（`cors({ origin: allowedOrigins })`）；
  - 对 `/api/auth/login` 与上传接口启用 Rate Limiter；
  - JSON Body 上限收敛至安全阈值（512KB），大文件仅走独立 Upload 管道；
  - 统一结构化错误响应 `{ code, error, requestId }`。

---

### Phase 2 — **P1: Road Warrior & Content Inspection**（工期：~3 周）
> **目标**：优化异地/移动端操作体验，上线高频文本文档预览与内容审查能力。

- [ ] **TODO P1-1: PWA 建议模式与 App Shell 缓存**
  - 引入 `vite-plugin-pwa`，配置 Web App Manifest 与 Service Worker；
  - 缓存前端 App Shell（HTML/CSS/JS/图标字体），实现秒开体验；
  - 在 README 与系统设置中提供「安装为独立应用」引导说明。
- [ ] **TODO P1-2: 多语言文档与代码预览器 (Content Inspector)**
  - 实现通用 `CodePreviewModal` / `FileInspectorDrawer` 组件；
  - 支持 `.json`, `.md`, `.py`, `.ts`, `.js`, `.yaml`, `.toml`, `.sh` 等格式高亮渲染；
  - 提供行号、行范围定位（`#L10-L30`）、一键复制、插入 `@path` 到输入框；
  - 在文件树抽屉中增加「点击即预览」操作按钮。
- [ ] **TODO P1-3: 命令语义危险高亮与临时白名单**
  - 在 `PermissionCard` 前置接入轻量危险模式解析引擎；
  - 针对高危指令（`rm -rf /`, `curl ... | bash`, `chmod 777`, `git push --force`）进行高亮标红预警；
  - 增加「本次允许 10 分钟」临时内存白名单选项。
- [ ] **TODO P1-4: 移动端触控与 WebTTY 交互打磨**
  - WebTTY 虚拟按键尺寸优化至 44pt 触摸标准，新增 `Ctrl+W`、`Ctrl+L`、`PageUp/Down`；
  - iOS Safari 剪贴板图片粘贴事件深度兼容与 Fallback 兜底；
  - 移动端侧边栏滑动唤出手势支持。
- [ ] **TODO P1-5: 锁屏 Web Push 授权通知**
  - 接入 Web Push 协议（VAPID 配置）；
  - 当后台出现危险 Tool 审批请求或长任务完成时，向已安装 PWA 的设备发送通知；
  - 锁屏通知支持快速点击响应。

---

### Phase 3 — **P2: Antigravity Powerhouse (专属深度能力)**（工期：~4 周）
> **目标**：打造 Antigravity CLI 独家壁垒，全面提升复杂 Agent 任务消费与管理效率。

- [ ] **TODO P2-1: Subagents 协同拓扑可视化**
  - 监听 `invoke_subagent` 与 subagent 状态事件；
  - 在前端渲染 Agent 拓扑关系图谱（展示 Parent 与 Subagents 派发关系）；
  - 节点集成实时状态（running/idle/waiting/errored）与时长统计；
  - 支持点击任一 Subagent 节点滑出独立子会话 Transcript 抽屉。
- [ ] **TODO P2-2: Artifacts 专属渲染抽屉**
  - 新增 `ArtifactsDrawer` 侧边浮层与全屏视图；
  - 原生解析并沉浸式渲染 Markdown 交付文档；
  - 支持 Carousel 多 Slide 幻灯片组件（`<!-- slide -->` 解析）；
  - 支持 Mermaid 流程图/架构图渲染与一键导出；
  - 支持 Code Diff 代码变更对比器。
- [ ] **TODO P2-3: Skills & Rules 热载与开关管理面板**
  - 服务端扫描 `~/.gemini/antigravity-cli/skills/` 与项目 Rules；
  - WebUI 设置中心增加「Skills & Rules」专属管理 Tab；
  - 支持卡片化展示各 Skill 的 Name, Description, Trigger 规则；
  - 提供实时 Toggle Switch 开关与一键「热重载（Refresh & Hot Reload）」。
- [ ] **TODO P2-4: 临时只读分享链接 (Read-Only Share)**
  - Session 详情增加「生成只读分享链接」按钮；
  - 服务端签发带 TTL（1h/24h/7d）的 Share Token；
  - 专属 Read-Only 视图模式：禁用输入框、禁用 WebTTY、禁用命令审批，仅供只读浏览。
- [ ] **TODO P2-5: MCP 状态巡检器 (MCP Inspector)**
  - 读取当前配置的 MCP Servers 列表（Eager/Lazy）；
  - 展示 Server 运行状态、工具列表、资源清单与 Prompt 模板；
  - 提供轻量 Ping 连通性测试。

---

### Phase 4 — **P3: Polish, Ecosystem & Delivery**（持续迭代）
> **目标**：完善工程体系、文档站、分发打包与极致性能。

- [ ] **TODO P3-1: 性能预算与打包优化**
  - 引入 `rollup-plugin-visualizer` 监控 Bundle 体积，保持首屏 JS < 300KB（Gzip）；
  - 关键长会话组件接入虚拟列表（Virtual List），万行 Transcript 滚屏零卡顿。
- [ ] **TODO P3-2: 生产反代与隧道一键脚本**
  - 完善 Caddyfile / Nginx / Cloudflare Tunnel 一键配置指南；
  - 提供简易 CLI 指令 `angryui tunnel` 快速输出公网访问 URL 与二维码。
- [ ] **TODO P3-3: 国际化与社区贡献维护**
  - 维护 5 语言字典同步（en, zh-CN, zh-TW, ja, es）；
  - 保持全套单元测试与契约测试覆盖率 > 90%。

---

## 8. 端到端理想用户旅程 (User Journey 2026)

一名 Solo 独立开发者在周末外出，宿主机器在家中运行 `agy`：

1. **移动端秒开**：通过手机主屏幕点击 **AngryUI PWA** 图标，App Shell 本地毫秒级就绪，自动通过 Bearer Token 安全接入；
2. **状态感知**：顶栏显示「Host Online · 2 个会话进行中」，无多余离线排队困扰；
3. **协同拓扑**：点开任务，**Subagents 拓扑图** 清晰展示主 Agent 正在调度 `research` 与 `code-reviewer` 并行工作；
4. **代码与文档审查**：在 **File Inspector** 中直接点开刚生成的 `.py` 核心算法与 `.json` 配置文件，语法高亮、行号清晰，快速 Review 逻辑；
5. **锁屏即时审批**：Agent 触发 `rm -rf ./dist`，手机收到 **Web Push 推送**，锁屏点击「Allow Once」即刻放行；
6. **交付物沉浸消费**：任务完成，滑出 **Artifacts 专属抽屉**，查看多 Slide 方案演示与 Mermaid 架构图；
7. **一键临时分享**：点击「生成 24 小时只读分享链接」，发送给远程同事进行 Review，无越权风险；
8. **终端兜底控制**：如遇特殊情况，随时打开 **WebTTY**，利用 44pt 触屏专用虚拟键快速执行 `git status`。

---

## 9. 总结与后续行动

AngryUI 坚持 **Solo Dev First**、**极轻量架构（<50MB）** 与 **Antigravity 深度绑定** 的演进路线，杜绝企业级臃肿设计，集中力量打造最懂 Antigravity 的现代 Web 伴侣。

接下来将按 **Phase 1 (P0 Trust Baseline) $\rightarrow$ Phase 2 (P1 Road Warrior & Content Inspector) $\rightarrow$ Phase 3 (P2 Antigravity Powerhouse)** 节奏稳步推进。
