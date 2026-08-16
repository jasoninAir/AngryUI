import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useConversation } from '@/hooks/useConversation';
import { useSidebar } from '@/context/SidebarContext';
import { useSessionStatus } from '@/context/SessionStatusContext';
import { SUPPORTED_MODELS, getModelConfig, EffortLevel } from '@/lib/models';
import { MessageList } from './MessageList';
import { ChatInput, ChatInputHandle } from './ChatInput';
import { FileExplorerDrawer } from './FileExplorerDrawer';
import {
  Folder,
  History,
  Terminal,
  PanelLeftOpen,
  ShieldAlert,
  Shield,
  Zap,
  CheckCircle2,
  PlusCircle,
  SlidersHorizontal,
  FolderTree,
  X
} from 'lucide-react';

// Code-split the WebTTY component — xterm.js + CSS is heavy and only
// needed when the user opens the terminal fallback.
const WebTTYModal = lazy(() =>
  import('../tui/WebTTYModal').then((m) => ({ default: m.WebTTYModal }))
);

export function ChatContainer({ conversationId }: { conversationId: string }) {
  const [searchParams] = useSearchParams();
  const workspaceParam = searchParams.get('workspace') || undefined;
  const { isOpen, isMobile, toggleSidebar } = useSidebar();
  const { setLocalStatus } = useSessionStatus();
  const [workspace, setWorkspace] = useState<string | undefined>(workspaceParam);
  const [showFileExplorer, setShowFileExplorer] = useState<boolean>(false);
  const chatInputRef = useRef<ChatInputHandle>(null);

  // Risk control mode: default false (Protected / Safe Mode)
  const [autoApprove, setAutoApprove] = useState<boolean>(() => {
    try {
      return localStorage.getItem('agy_auto_approve_tools') === 'true';
    } catch {
      return false;
    }
  });

  const toggleAutoApprove = () => {
    setAutoApprove((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('agy_auto_approve_tools', String(next));
      } catch {}
      return next;
    });
  };

  const {
    messages,
    status,
    send,
    cancel,
    interactivePrompt,
    clearInteractivePrompt,
    permissionPrompt,
    clearPermissionPrompt,
    refresh,
    loadHistory,
    loadedTurns,
    totalTurns,
    hasMoreHistory,
    historyLoading
  } = useConversation(conversationId);

  useEffect(() => {
    if (workspaceParam) {
      setWorkspace(workspaceParam);
    } else if (conversationId) {
      fetch(`/api/conversations/${conversationId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((conv) => {
          if (conv?.workspace_uris?.[0]) {
            const ws = conv.workspace_uris[0].replace(/^file:\/\//, '');
            setWorkspace(ws);
          }
        })
        .catch(() => {});
    }
  }, [conversationId, workspaceParam]);

  useEffect(() => {
    if (interactivePrompt || permissionPrompt) {
      setLocalStatus(conversationId, 'WAITING_INPUT');
    } else if (status === 'RUNNING') {
      setLocalStatus(conversationId, 'RUNNING');
    } else {
      setLocalStatus(conversationId, 'IDLE');
    }
  }, [conversationId, interactivePrompt, permissionPrompt, setLocalStatus, status]);

  const [model, setModel] = useState<string>(SUPPORTED_MODELS[0].name);
  const [effort, setEffort] = useState<EffortLevel | undefined>(SUPPORTED_MODELS[0].defaultEffort || 'high');
  const [showTty, setShowTty] = useState(false);

  const currentModelConfig = getModelConfig(model);

  const handleModelChange = (newModelName: string) => {
    setModel(newModelName);
    const cfg = getModelConfig(newModelName);
    if (cfg.efforts.length > 0) {
      if (!effort || !cfg.efforts.includes(effort)) {
        setEffort(cfg.defaultEffort || cfg.efforts[0]);
      }
    } else {
      setEffort(undefined);
    }
  };

  const handleAllowOnceAndContinue = () => {
    clearPermissionPrompt();
    send('请继续执行未完成的分析任务', model, effort, workspace, true);
  };

  const handleAddToAllowlistAndContinue = async () => {
    if (permissionPrompt?.command) {
      try {
        const cmd = permissionPrompt.command.trim();
        const firstToken = cmd.split(/\s+/)[0];
        const baseCmd = firstToken.startsWith('/') ? firstToken.split('/').pop() : firstToken;
        const pattern = `command(${baseCmd || cmd})`;
        await fetch('/api/settings/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pattern })
        });
      } catch (e) {
        console.error('Failed to add allow pattern:', e);
      }
    }
    clearPermissionPrompt();
    send('请继续执行未完成的分析任务', model, effort, workspace, autoApprove);
  };

  const handleInsertPath = (relPath: string) => {
    chatInputRef.current?.insertSnippet(`@${relPath}`);
  };

  const cleanWorkspaceDisplay = workspace?.startsWith('file://')
    ? workspace.replace('file://', '')
    : workspace;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Top Header Bar with dynamic wrap for mobile/desktop */}
      <div className="border-b border-border px-3 py-2 flex flex-wrap items-center justify-between gap-y-2 gap-x-2.5 shrink-0 bg-card/50">
        {/* Left Cluster: Sidebar Toggle, Workspace, Model & Effort Selectors */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {(!isOpen || isMobile) && (
            <button
              onClick={toggleSidebar}
              title="展开侧边栏"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0 cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          {cleanWorkspaceDisplay && (
            <div
              title={`Workspace: ${cleanWorkspaceDisplay}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 border border-border px-2 py-1 rounded-md max-w-[140px] sm:max-w-[200px] truncate shrink-0"
            >
              <Folder className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{cleanWorkspaceDisplay.split('/').filter(Boolean).slice(-2).join('/')}</span>
            </div>
          )}

          {/* Model Selector Dropdown */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Model:</span>
            <select
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="border border-input rounded-md px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary truncate max-w-[150px] sm:max-w-[200px]"
            >
              {SUPPORTED_MODELS.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Effort Selector Dropdown (Linked to Model) */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Effort:</span>
            {currentModelConfig.efforts.length > 0 ? (
              <select
                value={effort || currentModelConfig.defaultEffort || currentModelConfig.efforts[0]}
                onChange={(e) => setEffort(e.target.value as EffortLevel)}
                className="border border-input rounded-md px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary capitalize"
              >
                {currentModelConfig.efforts.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                  </option>
                ))}
              </select>
            ) : (
              <span
                title="该模型不支持调整思考强度"
                className="text-[11px] border border-border/60 rounded px-2 py-0.5 bg-muted/40 text-muted-foreground/70 cursor-not-allowed select-none"
              >
                Default
              </span>
            )}
          </div>
        </div>

        {/* Right Cluster: Action Buttons (History, File Explorer, WebTTY, Status) */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Load History / Load More Button */}
          <button
            onClick={() => loadHistory(5)}
            disabled={historyLoading || !hasMoreHistory}
            title={
              !hasMoreHistory
                ? '已加载全部历史对话'
                : loadedTurns === 0
                ? '加载 5 轮历史对话'
                : `已加载 ${loadedTurns} 轮，点击再加载 5 轮`
            }
            className={`text-xs border border-border rounded-md px-2.5 py-1 flex items-center gap-1.5 transition-colors cursor-pointer ${
              !hasMoreHistory
                ? 'opacity-40 cursor-not-allowed bg-muted/40 text-muted-foreground'
                : 'hover:bg-accent text-foreground'
            }`}
          >
            <History className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
            <span>
              {historyLoading
                ? 'Loading...'
                : loadedTurns === 0
                ? 'Load History'
                : hasMoreHistory
                ? 'Load More'
                : 'All Loaded'}
            </span>
            {totalTurns !== null && (
              <span className="text-[10px] opacity-75 font-mono">
                ({loadedTurns}/{totalTurns})
              </span>
            )}
          </button>

          {/* Right File Explorer Toggle Button */}
          <button
            onClick={() => setShowFileExplorer(!showFileExplorer)}
            title={showFileExplorer ? '收起工作区文件目录' : '展开工作区文件目录'}
            className={`text-xs border rounded-md px-2.5 py-1 flex items-center gap-1.5 transition-colors cursor-pointer ${
              showFileExplorer
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground border-border hover:bg-accent'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>文件目录</span>
          </button>

          {/* Open WebTTY Button */}
          <button
            onClick={() => setShowTty(true)}
            className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 hover:bg-accent flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Open WebTTY</span>
          </button>

          <span className="text-[11px] font-mono uppercase bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
            {status}
          </span>
        </div>
      </div>

      {/* Main Body: Split View between Chat and File Explorer Drawer */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left / Center Area: Messages and Chat Input */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <MessageList messages={messages} />
          </div>

          {/* Interactive Prompt Banner (if needed) */}
          {interactivePrompt && !permissionPrompt && (
            <div className="bg-amber-500/10 border-t border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 shrink-0">
              <span>⚠️ 当前任务可能需要交互式输入或权限确认</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTty(true)}
                  className="px-2.5 py-1 bg-amber-500 text-white rounded font-medium hover:bg-amber-600 transition-colors cursor-pointer"
                >
                  打开 WebTTY 接管
                </button>
                <button
                  onClick={() => clearInteractivePrompt()}
                  className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                >
                  忽略
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Authorization Bar right above input */}
          {permissionPrompt && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mx-3 mb-2 flex flex-col gap-2.5 shadow-sm text-xs shrink-0 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>检测到工具执行需要授权</span>
                </div>
                <button
                  onClick={clearPermissionPrompt}
                  className="text-muted-foreground hover:text-foreground text-xs p-0.5 rounded hover:bg-muted cursor-pointer"
                  title="忽略"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {permissionPrompt.command && (
                <div className="bg-background/90 border border-border/80 rounded-md p-2 font-mono text-[11px] text-foreground break-all select-all">
                  <span className="text-muted-foreground mr-1.5">$</span>
                  {permissionPrompt.command}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
                <button
                  onClick={handleAllowOnceAndContinue}
                  className="px-3 py-1.5 bg-amber-500 text-white rounded-md font-medium hover:bg-amber-600 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>允许本次并继续</span>
                </button>

                {permissionPrompt.command && (
                  <button
                    onClick={handleAddToAllowlistAndContinue}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>加入白名单并继续</span>
                  </button>
                )}

                <button
                  onClick={() => setShowTty(true)}
                  className="px-2.5 py-1.5 border border-border bg-background rounded-md text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>WebTTY 接管</span>
                </button>

                <button
                  onClick={clearPermissionPrompt}
                  className="ml-auto px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors cursor-pointer"
                >
                  忽略
                </button>
              </div>
            </div>
          )}

          {/* Permission Mode Toggle Bar (Positioned right above textarea at bottom) */}
          <div className="px-3 py-1.5 bg-card/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground select-none shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAutoApprove}
                title={autoApprove ? '点击切换为安全受控模式' : '点击切换为全自动执行模式'}
                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  autoApprove
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 shadow-xs'
                    : 'bg-muted/80 border-border text-foreground hover:bg-accent'
                }`}
              >
                {autoApprove ? (
                  <>
                    <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>⚡ 全自动模式 (Auto-Approve)</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3 h-3 text-emerald-500" />
                    <span>🛡️ 安全受控模式 (Ask Permission)</span>
                  </>
                )}
              </button>
              <span className="text-[10px] text-muted-foreground/80 hidden sm:inline">
                {autoApprove ? '工具执行全自动放行' : '默认拦截未授权命令，支持单次放行或一键白名单'}
              </span>
            </div>

            <Link
              to="/settings"
              className="text-[11px] hover:text-foreground flex items-center gap-1 hover:underline text-muted-foreground"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>白名单规则</span>
            </Link>
          </div>

          {/* Pinned Bottom Input */}
          <div className="shrink-0">
            <ChatInput
              ref={chatInputRef}
              onSend={(text) => send(text, model, effort, workspace, autoApprove)}
              onCancel={cancel}
              status={status}
            />
          </div>
        </div>

        {/* Right-Side File Explorer Drawer (Collapsed by default, opens to the left) */}
        <FileExplorerDrawer
          workspace={workspace}
          isOpen={showFileExplorer}
          onClose={() => setShowFileExplorer(false)}
          onInsertPath={handleInsertPath}
        />
      </div>

      {/* WebTTY Modal (Lazy Loaded) */}
      {showTty && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 bg-background flex items-center justify-center text-muted-foreground text-sm">
              Loading WebTTY…
            </div>
          }
        >
          <WebTTYModal
            conversationId={conversationId}
            onClose={() => {
              setShowTty(false);
              clearInteractivePrompt();
              clearPermissionPrompt();
              refresh();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
