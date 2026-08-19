import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useProjectIndex } from '@/hooks/useProjectIndex';
import { useSidebar } from '@/context/SidebarContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSessionStatus } from '@/context/SessionStatusContext';
import { WorkspaceGroup } from './WorkspaceGroup';
import { NewSessionModal } from './NewSessionModal';
import { LanguageMenu } from './LanguageMenu';
import { Archive, RefreshCw, Settings, Plus, PanelLeftClose, WifiOff } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export function Sidebar() {
  const location = useLocation();
  const { isOpen, isMobile, closeSidebar, toggleSidebar } = useSidebar();
  const { t } = useLanguage();
  const { wsReadyState, wsRetryCount } = useSessionStatus();
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);

  const {
    groups,
    archivedCount,
    totalCount,
    showArchived,
    setShowArchived,
    rename,
    archive,
    remove,
    refresh,
    loading
  } = useProjectIndex();

  // Extract active conversationId and workspace query from route /chat/:id?workspace=...
  const match = location.pathname.match(/^\/chat\/([^/]+)/);
  const activeConversationId = match ? match[1] : undefined;
  const searchParams = new URLSearchParams(location.search);
  const rawWorkspace = searchParams.get('workspace');
  const activeWorkspaceClean = rawWorkspace
    ? rawWorkspace.startsWith('file://')
      ? rawWorkspace.replace('file://', '')
      : rawWorkspace
    : undefined;

  // Synthesize group list: if active route is a new session with a workspace not in SQLite yet, include it
  const displayGroups = [...groups];
  if (
    activeConversationId &&
    activeWorkspaceClean &&
    !groups.some((g) => {
      const gw = g.workspace.startsWith('file://') ? g.workspace.replace('file://', '') : g.workspace;
      return gw === activeWorkspaceClean;
    })
  ) {
    displayGroups.unshift({
      workspace: activeWorkspaceClean,
      conversations: []
    });
  }

  const existingWorkspaces = groups.map((g) => g.workspace);

  if (!isOpen && !isMobile) {
    return null;
  }

  const sidebarContent = (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className={`h-full h-[100dvh] max-h-[100dvh] bg-card border-r border-border flex flex-col justify-between select-none ${
        isMobile
          ? 'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200'
          : 'w-64 shrink-0 transition-all duration-200'
      }`}
    >
      {/* Top Header */}
      <div className="p-3 border-b border-border flex flex-col gap-1.5 shrink-0">
        <Link to="/" className="flex items-center gap-2 min-w-0 group hover:opacity-90 transition-opacity">
          <img
            src="/logo.png"
            alt="AngryUI Logo"
            className="w-5 h-5 rounded-md object-contain shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
          />
          <h2 className="text-base font-bold tracking-tight truncate bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
            {t('brandTitle')}
          </h2>
          {totalCount > 0 && (
            <span className="text-[10px] bg-secondary text-secondary-foreground font-mono px-1.5 py-0.5 rounded shrink-0">
              {totalCount}
            </span>
          )}
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5 shrink-0">
            {/* New Project / Session Button (+) */}
            <button
              onClick={() => setShowNewSessionModal(true)}
              title={t('newSessionTitle')}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
            {/* Refresh Button */}
            <button
              onClick={() => refresh()}
              disabled={loading}
              title={t('refreshFiles')}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {/* Collapse Sidebar Button */}
            <button
              onClick={toggleSidebar}
              title="Collapse Sidebar"
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-0.5 cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          {/* Connection Status Indicator */}
          {wsReadyState === WebSocket.CONNECTING && (
            <span className="text-xs text-muted-foreground">Connecting…</span>
          )}
          {wsReadyState === WebSocket.CLOSED && wsRetryCount > 0 && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Reconnecting ({wsRetryCount})…
            </span>
          )}
          {wsReadyState === WebSocket.CLOSED && wsRetryCount === 0 && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Center: Scrollable Projects & Conversations */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
        {displayGroups.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <p>{t('noSessionsFound')}</p>
            <button
              onClick={() => setShowNewSessionModal(true)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
            >
              <Plus className="w-3 h-3" /> {t('newSession')}
            </button>
          </div>
        ) : (
          displayGroups.map((g) => (
            <div key={g.workspace}>
              <WorkspaceGroup
                workspace={g.workspace}
                conversations={g.conversations}
                activeConversationId={activeConversationId}
                onRename={rename}
                onArchive={archive}
                onDelete={remove}
              />
            </div>
          ))
        )}
      </div>

      {/* Bottom Footer: Left-aligned Language & Settings, Right-aligned Archive Filter */}
      <div className="p-2.5 border-t border-border bg-card/90 backdrop-blur-sm flex items-center justify-between text-xs shrink-0 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Left Cluster: Language Selector (aA), Theme Toggle & Settings */}
        <div className="flex items-center gap-1">
          {/* Language Switcher (aA icon with upward popover) */}
          <LanguageMenu dropUp={true} />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Settings Button */}
          <Link
            to="/settings"
            onClick={() => {
              if (isMobile) closeSidebar();
            }}
            title={t('settings')}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>

        {/* Right Cluster: Archive Filter (if any) */}
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived(!showArchived)}
            title={showArchived ? t('hideArchived') : t('showArchived')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
              showArchived
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span className="font-mono">{archivedCount}</span>
          </button>
        )}
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={closeSidebar}
        />
      )}

      {/* Render Sidebar if Open (or on desktop when open) */}
      {isOpen && sidebarContent}

      {/* New Session Modal */}
      {showNewSessionModal && (
        <NewSessionModal
          existingWorkspaces={existingWorkspaces}
          onClose={() => {
            setShowNewSessionModal(false);
            if (isMobile) closeSidebar();
          }}
        />
      )}
    </>
  );
}
