import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useConversation } from '@/hooks/useConversation';
import { useSidebar } from '@/context/SidebarContext';
import { useSessionStatus } from '@/context/SessionStatusContext';
import { useLanguage } from '@/context/LanguageContext';
import { SUPPORTED_MODELS, getModelConfig, EffortLevel } from '@/lib/models';
import { authFetch } from '@/lib/api';
import { findDangerMatches } from '@/lib/dangerCommands';
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
  const { t } = useLanguage();
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
    interactivePrompt,
    permissionPrompt,
    historyLoading,
    totalTurns,
    loadedTurns,
    hasMoreHistory,
    send,
    cancel,
    loadHistory,
    clearInteractivePrompt,
    clearPermissionPrompt
  } = useConversation(conversationId);

  // Sync real-time session status to global context
  useEffect(() => {
    if (status !== 'IDLE') {
      setLocalStatus(conversationId, status);
    }
  }, [conversationId, status, setLocalStatus]);

  const [model, setModel] = useState<string>(() => {
    return localStorage.getItem(`agy_model_${conversationId}`) || 'Gemini 3.7 Flash (High)';
  });

  const currentModelConfig = getModelConfig(model);

  const [effort, setEffort] = useState<EffortLevel | undefined>(() => {
    if (currentModelConfig.efforts.length === 0) return undefined;
    return (localStorage.getItem(`agy_effort_${conversationId}`) as EffortLevel) || currentModelConfig.defaultEffort;
  });

  const handleModelChange = (newModelName: string) => {
    setModel(newModelName);
    localStorage.setItem(`agy_model_${conversationId}`, newModelName);

    const cfg = getModelConfig(newModelName);
    if (cfg.efforts.length > 0) {
      const newEffort = cfg.defaultEffort || cfg.efforts[0];
      setEffort(newEffort);
      localStorage.setItem(`agy_effort_${conversationId}`, newEffort);
    } else {
      setEffort(undefined);
      localStorage.removeItem(`agy_effort_${conversationId}`);
    }
  };

  const [showTty, setShowTty] = useState(false);

  // Auto-fill workspace from database if not specified in searchParams
  useEffect(() => {
    if (!workspace) {
      authFetch('/api/projects')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.groups) {
            for (const g of data.groups) {
              const found = g.conversations.find((c: any) => c.conversation_id === conversationId);
              if (found && g.workspace) {
                const cleanW = g.workspace.startsWith('file://') ? g.workspace.replace('file://', '') : g.workspace;
                setWorkspace(cleanW);
                break;
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [conversationId, workspace]);

  const handleInsertPath = (relPath: string) => {
    chatInputRef.current?.insertSnippet(`@${relPath}`);
  };

  const handleAllowOnceAndContinue = () => {
    clearPermissionPrompt();
    send('允许执行本次命令，请继续执行下一步任务。', model, effort, workspace, true);
  };

  const handleAddToAllowlistAndContinue = async () => {
    if (!permissionPrompt?.command) {
      handleAllowOnceAndContinue();
      return;
    }
    const cmdRule = `command(${permissionPrompt.command})`;
    try {
      await authFetch('/api/settings/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: cmdRule })
      });
    } catch (e) {
      console.error('Failed to add to allowlist:', e);
    }
    clearPermissionPrompt();
    send(`已将命令 ${permissionPrompt.command} 加入白名单规则，请继续执行任务。`, model, effort, workspace, false);
  };

  const cleanWorkspaceDisplay = workspace ? (workspace.startsWith('file://') ? workspace.replace('file://', '') : workspace) : undefined;

  return (
    <div className="flex-1 flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Top Header Controls */}
      <div className="border-b border-border p-3 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-card/40 select-none">
        {/* Left Cluster: Sidebar Toggle, Workspace Badge, Model & Effort Selectors */}
        <div className="flex items-center gap-2 overflow-hidden flex-wrap">
          {(!isOpen || isMobile) && (
            <button
              onClick={toggleSidebar}
              title="Toggle Sidebar"
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
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('model')}:</span>
            <select
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="border border-input rounded-md px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary truncate max-w-[150px] sm:max-w-[200px] cursor-pointer"
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
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('effort')}:</span>
            {currentModelConfig.efforts.length > 0 ? (
              <select
                value={effort || currentModelConfig.defaultEffort || currentModelConfig.efforts[0]}
                onChange={(e) => setEffort(e.target.value as EffortLevel)}
                className="border border-input rounded-md px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary capitalize cursor-pointer"
              >
                {currentModelConfig.efforts.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl === 'low' ? t('effortLow') : lvl === 'medium' ? t('effortMedium') : lvl === 'high' ? t('effortHigh') : lvl}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className="text-[11px] border border-border/60 rounded px-2 py-0.5 bg-muted/40 text-muted-foreground/70 cursor-not-allowed select-none"
              >
                {t('effortAuto')}
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
                ? t('allLoaded')
                : loadedTurns === 0
                ? t('loadEarlierMessages')
                : `${t('loadEarlierMessages')} (+5)`
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
                ? t('loadingEarlier')
                : loadedTurns === 0
                ? t('loadEarlierMessages')
                : hasMoreHistory
                ? t('loadEarlierMessages')
                : t('allLoaded')}
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
            title={t('fileExplorer')}
            className={`text-xs border rounded-md px-2.5 py-1 flex items-center gap-1.5 transition-colors cursor-pointer ${
              showFileExplorer
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground border-border hover:bg-accent'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>{t('fileExplorer')}</span>
          </button>

          {/* Open WebTTY Button */}
          <button
            onClick={() => setShowTty(true)}
            className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 hover:bg-accent flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{t('webtty')}</span>
          </button>

          <span className="text-[11px] font-mono uppercase bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
            {status === 'IDLE'
              ? t('idle')
              : status === 'RUNNING'
              ? t('running')
              : status === 'PAUSED'
              ? t('paused')
              : status === 'WAITING_INPUT'
              ? t('waitingInput')
              : status}
          </span>
        </div>
      </div>

      {/* Main Body: Split View between Chat and File Explorer Drawer */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left / Center Area: Messages and Chat Input */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <MessageList messages={messages} loading={historyLoading} />
          </div>

          {/* Interactive Prompt Banner (if needed) */}
          {interactivePrompt && !permissionPrompt && (
            <div className="bg-amber-500/10 border-t border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 shrink-0">
              <span>⚠️ {t('permissionRequired')}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTty(true)}
                  className="px-2.5 py-1 bg-amber-500 text-white rounded font-medium hover:bg-amber-600 transition-colors cursor-pointer"
                >
                  {t('takeoverTTY')}
                </button>
                <button
                  onClick={() => clearInteractivePrompt()}
                  className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                >
                  {t('ignore')}
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
                  <span>{t('permissionRequired')}</span>
                </div>
                <button
                  onClick={clearPermissionPrompt}
                  className="text-muted-foreground hover:text-foreground text-xs p-0.5 rounded hover:bg-muted cursor-pointer"
                  title={t('ignore')}
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
              {permissionPrompt.command && (() => {
                const dangers = findDangerMatches(permissionPrompt.command);
                return dangers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {dangers.map(d => (
                      <span
                        key={d.label}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          d.severity === 'high' ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                        }`}
                      >
                        ⚠ {d.label}
                      </span>
                    ))}
                  </div>
                ) : null;
              })()}

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
                <button
                  onClick={handleAllowOnceAndContinue}
                  className="px-3 py-1.5 bg-amber-500 text-white rounded-md font-medium hover:bg-amber-600 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('allowOnce')}</span>
                </button>

                {permissionPrompt.command && (
                  <button
                    onClick={handleAddToAllowlistAndContinue}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{t('addToWhitelist')}</span>
                  </button>
                )}

                <button
                  onClick={() => setShowTty(true)}
                  className="px-2.5 py-1.5 border border-border bg-background rounded-md text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{t('takeoverTTY')}</span>
                </button>

                <button
                  onClick={clearPermissionPrompt}
                  className="ml-auto px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors cursor-pointer"
                >
                  {t('ignore')}
                </button>
              </div>
            </div>
          )}

          {/* Permission Mode Toggle Bar (Positioned right above textarea at bottom) */}
          <div className="px-3 py-1.5 bg-card/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground select-none shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAutoApprove}
                title={autoApprove ? t('safeModeDesc') : t('autoApproveDesc')}
                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  autoApprove
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 shadow-xs'
                    : 'bg-muted/80 border-border text-foreground hover:bg-accent'
                }`}
              >
                {autoApprove ? (
                  <>
                    <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>{t('autoApproveMode')}</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3 h-3 text-emerald-500" />
                    <span>{t('safeMode')}</span>
                  </>
                )}
              </button>
              <span className="text-[10px] text-muted-foreground/80 hidden sm:inline">
                {autoApprove ? t('autoApproveDesc') : t('safeModeDesc')}
              </span>
            </div>

            <Link
              to="/settings"
              className="text-[11px] hover:text-foreground flex items-center gap-1 hover:underline text-muted-foreground"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{t('whitelistRules')}</span>
            </Link>
          </div>

          {/* Pinned Bottom Input */}
          <div className="shrink-0">
            <ChatInput
              ref={chatInputRef}
              conversationId={conversationId}
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
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          }
        >
          <WebTTYModal conversationId={conversationId} onClose={() => setShowTty(false)} />
        </Suspense>
      )}
    </div>
  );
}
