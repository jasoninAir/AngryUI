import { useState, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConversation } from '@/hooks/useConversation';
import { useSidebar } from '@/context/SidebarContext';
import { SUPPORTED_MODELS, getModelConfig, EffortLevel } from '@/lib/models';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { Folder, History, Terminal, PanelLeftOpen } from 'lucide-react';

// Code-split the WebTTY component — xterm.js + CSS is heavy and only
// needed when the user opens the terminal fallback.
const WebTTYModal = lazy(() =>
  import('../tui/WebTTYModal').then((m) => ({ default: m.WebTTYModal }))
);

export function ChatContainer({ conversationId }: { conversationId: string }) {
  const [searchParams] = useSearchParams();
  const workspaceParam = searchParams.get('workspace') || undefined;
  const { isOpen, isMobile, toggleSidebar } = useSidebar();

  const {
    messages,
    status,
    send,
    cancel,
    interactivePrompt,
    clearInteractivePrompt,
    refresh,
    loadHistory,
    loadedTurns,
    totalTurns,
    hasMoreHistory,
    historyLoading
  } = useConversation(conversationId);

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

  const cleanWorkspaceDisplay = workspaceParam?.startsWith('file://')
    ? workspaceParam.replace('file://', '')
    : workspaceParam;

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
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
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

        {/* Right Cluster: Action Buttons (History, WebTTY, Status) */}
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
            className={`text-xs border border-border rounded-md px-2.5 py-1 flex items-center gap-1.5 transition-colors ${
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

          {/* Open WebTTY Button */}
          <button
            onClick={() => setShowTty(true)}
            className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 hover:bg-accent flex items-center gap-1.5 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Open WebTTY</span>
          </button>

          <span className="text-[11px] font-mono uppercase bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
            {status}
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <MessageList messages={messages} />
      </div>

      {/* Interactive Prompt Banner (if needed) */}
      {interactivePrompt && (
        <div className="bg-amber-500/10 border-t border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 shrink-0">
          <span>⚠️ 当前任务可能需要交互式输入或权限确认</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTty(true)}
              className="px-2.5 py-1 bg-amber-500 text-white rounded font-medium hover:bg-amber-600 transition-colors"
            >
              打开 WebTTY 接管
            </button>
            <button
              onClick={() => clearInteractivePrompt()}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              忽略
            </button>
          </div>
        </div>
      )}

      {/* Pinned Bottom Input */}
      <div className="shrink-0">
        <ChatInput
          onSend={(text) => send(text, model, effort, workspaceParam)}
          onCancel={cancel}
          status={status}
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
              refresh();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
