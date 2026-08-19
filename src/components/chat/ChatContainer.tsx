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
import { PermissionCard } from './PermissionCard';
import { QuotaModal } from '../quota/QuotaModal';
import { WhitelistModal } from '../whitelist/WhitelistModal';
import { CodePreviewModal } from '../common/CodePreviewModal';
import { addTemporaryRule, isTemporarilyAllowed } from '@/lib/tempWhitelist';
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
  Gauge,
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
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [inspectingFile, setInspectingFile] = useState<{ path: string; startLine?: number; endLine?: number } | null>(null);

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

  const handleAllowTemporaryAndContinue = () => {
    if (!permissionPrompt?.command) {
      handleAllowOnceAndContinue();
      return;
    }
    const cmd = permissionPrompt.command;
    addTemporaryRule(cmd, 10 * 60 * 1000);
    clearPermissionPrompt();
    send(`已临时允许命令 ${cmd} (10分钟内免确认)，请继续执行任务。`, model, effort, workspace, true);
  };

  // Auto-approve command if matching active 10-minute temporary memory whitelist
  useEffect(() => {
    if (permissionPrompt?.command && isTemporarilyAllowed(permissionPrompt.command)) {
      const cmd = permissionPrompt.command;
      clearPermissionPrompt();
      send(`命令 ${cmd} 命中10分钟临时白名单，已自动放行执行。`, model, effort, workspace, true);
    }
  }, [permissionPrompt, workspace, model, effort, clearPermissionPrompt, send]);

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
      <div className="border-b border-border px-2 sm:px-3 py-1.5 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 bg-card/40 select-none overflow-x-auto no-scrollbar">
        {/* Left Cluster: Sidebar Toggle, Workspace Badge, Model & Effort Selectors */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden shrink-0">
          {(!isOpen || isMobile) && (
            <button
              onClick={toggleSidebar}
              title="Toggle Sidebar"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0 cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          {cleanWorkspaceDisplay && (
            <div
              title={`Workspace: ${cleanWorkspaceDisplay}`}
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 border border-border px-2 py-1 rounded-md max-w-[140px] sm:max-w-[200px] truncate shrink-0"
            >
              <Folder className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{cleanWorkspaceDisplay.split('/').filter(Boolean).slice(-2).join('/')}</span>
            </div>
          )}

          {/* Model Selector Dropdown */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">{t('model')}:</span>
            <select
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="border border-input rounded-md px-1.5 sm:px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary truncate max-w-[120px] sm:max-w-[200px] cursor-pointer"
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
            <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">{t('effort')}:</span>
            {currentModelConfig.efforts.length > 0 ? (
              <select
                value={effort || currentModelConfig.defaultEffort || currentModelConfig.efforts[0]}
                onChange={(e) => setEffort(e.target.value as EffortLevel)}
                className="border border-input rounded-md px-1.5 sm:px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary capitalize cursor-pointer"
              >
                {currentModelConfig.efforts.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl === 'low' ? t('effortLow') : lvl === 'medium' ? t('effortMedium') : lvl === 'high' ? t('effortHigh') : lvl}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className="text-[10px] sm:text-[11px] border border-border/60 rounded px-1.5 sm:px-2 py-0.5 bg-muted/40 text-muted-foreground/70 cursor-not-allowed select-none hidden sm:inline"
              >
                {t('effortAuto')}
              </span>
            )}
          </div>
        </div>

        {/* Right Cluster: Action Buttons (History, File Explorer, WebTTY, Status) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
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
            className={`text-xs border border-border rounded-md px-2 sm:px-2.5 py-1 flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer ${
              !hasMoreHistory
                ? 'opacity-40 cursor-not-allowed bg-muted/40 text-muted-foreground'
                : 'hover:bg-accent text-foreground'
            }`}
          >
            <History className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">
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
                {loadedTurns}/{totalTurns}
              </span>
            )}
          </button>

          {/* Right File Explorer Toggle Button */}
          <button
            onClick={() => setShowFileExplorer(!showFileExplorer)}
            title={t('fileExplorer')}
            className={`text-xs border rounded-md p-1.5 sm:px-2.5 sm:py-1 flex items-center gap-1.5 transition-colors cursor-pointer ${
              showFileExplorer
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground border-border hover:bg-accent'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('fileExplorer')}</span>
          </button>

          {/* Quota Button */}
          <button
            onClick={() => setShowQuotaModal(true)}
            title={t('quotaTitleText')}
            className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md p-1.5 sm:px-2.5 sm:py-1 hover:bg-accent flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Gauge className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">{t('quotaTab')}</span>
          </button>

          {/* Open WebTTY Button */}
          <button
            onClick={() => setShowTty(true)}
            title={t('webtty')}
            className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md p-1.5 sm:px-2.5 sm:py-1 hover:bg-accent flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('webtty')}</span>
          </button>

          <span className="text-[10px] sm:text-[11px] font-mono uppercase bg-secondary px-1.5 sm:px-2 py-0.5 rounded text-secondary-foreground">
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
          <div className="flex-1 min-h-0 overflow-hidden relative">
            <MessageList
              key={conversationId}
              messages={messages}
              loading={historyLoading}
              onFileClick={(path, startLine, endLine) => setInspectingFile({ path, startLine, endLine })}
            />
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

          {/* Dynamic Authorization Card right above input */}
          {permissionPrompt && (
            <PermissionCard
              prompt={permissionPrompt}
              onAllowOnce={handleAllowOnceAndContinue}
              onAllowTemporary={handleAllowTemporaryAndContinue}
              onAddToWhitelist={handleAddToAllowlistAndContinue}
              onTakeoverTTY={() => setShowTty(true)}
              onDeny={clearPermissionPrompt}
            />
          )}

          {/* Permission Mode Toggle Bar (Positioned right above textarea at bottom) */}
          <div className="px-3 py-1.5 bg-card/40 border-t border-border flex items-center justify-between gap-2 text-xs text-muted-foreground select-none shrink-0 overflow-hidden">
            <div className="flex items-center gap-1.5 min-w-0 shrink-0">
              <button
                onClick={toggleAutoApprove}
                title={autoApprove ? t('safeModeDesc') : t('autoApproveDesc')}
                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  autoApprove
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 shadow-xs'
                    : 'bg-muted/80 border-border text-foreground hover:bg-accent'
                }`}
              >
                {autoApprove ? (
                  <>
                    <Zap className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                    <span className="whitespace-nowrap">{t('autoApproveMode')}</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="whitespace-nowrap">{t('safeMode')}</span>
                  </>
                )}
              </button>
              <span className="text-[10px] text-muted-foreground/80 hidden md:inline truncate">
                {autoApprove ? t('autoApproveDesc') : t('safeModeDesc')}
              </span>
            </div>

            <button
              onClick={() => setShowWhitelistModal(true)}
              className="text-[11px] hover:text-foreground flex items-center gap-1 hover:underline text-muted-foreground shrink-0 ml-auto whitespace-nowrap cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3 shrink-0" />
              <span>{t('whitelistRules')}</span>
            </button>
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
          onPreviewFile={(filePath) => setInspectingFile({ path: filePath })}
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

      {/* Quota Modal */}
      <QuotaModal isOpen={showQuotaModal} onClose={() => setShowQuotaModal(false)} />

      {/* Whitelist Rules Modal */}
      <WhitelistModal isOpen={showWhitelistModal} onClose={() => setShowWhitelistModal(false)} />

      {/* Code & Content Inspector Modal (P1-1) */}
      <CodePreviewModal
        isOpen={Boolean(inspectingFile)}
        filePath={inspectingFile?.path || ''}
        startLine={inspectingFile?.startLine}
        endLine={inspectingFile?.endLine}
        workspace={workspace}
        onClose={() => setInspectingFile(null)}
        onInsertReference={(refText) => chatInputRef.current?.insertSnippet(refText)}
      />
    </div>
  );
}
