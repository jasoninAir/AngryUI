import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useProjectIndex, type ProjectGroup } from '@/hooks/useProjectIndex';
import { useSidebar } from '@/context/SidebarContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSessionStatus } from '@/context/SessionStatusContext';
import { usePinnedWorkspaces } from '@/lib/pinnedWorkspaces';
import { WorkspaceGroup } from './WorkspaceGroup';
import { NewSessionModal } from './NewSessionModal';
import { LanguageMenu } from './LanguageMenu';
import { Archive, RefreshCw, Settings, Plus, PanelLeftClose, WifiOff, Gauge, Bug } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { QuotaModal } from '@/components/quota/QuotaModal';
import { SettingsModal } from '@/components/settings/SettingsModal';

export function Sidebar() {
  const location = useLocation();
  const { isOpen, isMobile, dragOffset, closeSidebar, toggleSidebar } = useSidebar();
  const { t } = useLanguage();
  const { wsReadyState, wsRetryCount } = useSessionStatus();
  const { pinnedWorkspaces, isPinned, togglePin } = usePinnedWorkspaces();
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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

  const isDragging = isMobile && dragOffset !== null;
  const isVisibleMobile = isMobile && (isOpen || isDragging);

  // Compute mobile drawer transform and backdrop opacity
  const mobileTranslateX = isDragging
    ? `${dragOffset - 288}px`
    : isOpen
    ? '0px'
    : '-100%';

  const backdropOpacity = isDragging
    ? (dragOffset / 288) * 0.6
    : isOpen
    ? 0.6
    : 0;

  const backdropPointerEvents = (isDragging && dragOffset > 15) || isOpen ? 'auto' : 'none';

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

  const normalizePathKey = (p: string): string => {
    let clean = p.startsWith('file://') ? p.replace(/^file:\/\//, '') : p;
    if (clean.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    return clean;
  };

  // Synthesize group list:
  // 1. Existing groups from SQLite index (with key canonicalization)
  // 2. Include all pinned workspaces (even with 0 sessions)
  // 3. Include active route workspace if not already present in an existing group
  // 4. Sort: pinned groups first, then alphabetically
  const groupMap = new Map<string, ProjectGroup>();
  for (const g of groups) {
    const cleanW = normalizePathKey(g.workspace);
    const existing = groupMap.get(cleanW);
    if (existing) {
      existing.conversations.push(...g.conversations);
    } else {
      groupMap.set(cleanW, {
        workspace: cleanW,
        conversations: [...g.conversations]
      });
    }
  }

  // Ensure all pinned workspaces are retained in the tree
  for (const pinned of pinnedWorkspaces) {
    const cleanPinned = normalizePathKey(pinned);
    if (!groupMap.has(cleanPinned)) {
      groupMap.set(cleanPinned, {
        workspace: cleanPinned,
        conversations: []
      });
    }
  }

  // Check if active conversation is already rendered in any group
  const isConversationInGroup = activeConversationId
    ? Array.from(groupMap.values()).some((g) =>
        g.conversations.some((c) => c.conversation_id === activeConversationId)
      )
    : false;

  // Ensure active route workspace is included only if not already grouped
  if (activeConversationId && activeWorkspaceClean && !isConversationInGroup) {
    const cleanActiveWs = normalizePathKey(activeWorkspaceClean);
    if (!groupMap.has(cleanActiveWs)) {
      groupMap.set(cleanActiveWs, {
        workspace: cleanActiveWs,
        conversations: []
      });
    }
  }

  const displayGroups = Array.from(groupMap.values()).sort((a, b) => {
    const aClean = normalizePathKey(a.workspace);
    const bClean = normalizePathKey(b.workspace);
    const aPinned = isPinned(aClean);
    const bPinned = isPinned(bClean);

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return aClean.localeCompare(bClean);
  });

  const existingWorkspaces = Array.from(
    new Set([...groups.map((g) => g.workspace), ...pinnedWorkspaces])
  );

  // On desktop, if sidebar is closed we render nothing.
  // On mobile, the sidebar is always mounted and animated via CSS translate.
  if (!isOpen && !isMobile) {
    return null;
  }

  const sidebarContent = (
    <nav
      role="navigation"
      aria-label="Main navigation"
      style={
        isMobile
          ? {
              transform: `translate3d(${mobileTranslateX}, 0, 0)`,
              transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
              pointerEvents: isVisibleMobile || isOpen ? 'auto' : 'none'
            }
          : undefined
      }
      className={`h-full h-[100dvh] max-h-[100dvh] bg-card border-r border-border flex flex-col justify-between select-none ${
        isMobile
          ? 'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl will-change-transform'
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
              onClick={() => refresh(true)}
              disabled={loading}
              title={t('refreshSessions')}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
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
                isPinned={isPinned(g.workspace)}
                onTogglePin={togglePin}
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

          {/* Quota Modal Trigger */}
          <button
            onClick={() => setShowQuotaModal(true)}
            title={t('quotaTitleText')}
            aria-label={t('quotaTitleText')}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center cursor-pointer"
          >
            <Gauge className="w-4 h-4 text-primary" />
          </button>

          {/* Report Bug Link */}
          <a
            href="https://github.com/jasoninAir/AngryUI/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            title={t('reportBug')}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center cursor-pointer"
          >
            <Bug className="w-4 h-4" />
          </a>

          {/* Settings Button */}
          <button
            onClick={() => {
              setShowSettingsModal(true);
              if (isMobile) closeSidebar();
            }}
            title={t('settings')}
            aria-label={t('settings')}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
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
      {isMobile && (
        <div
          style={{
            opacity: backdropOpacity,
            pointerEvents: backdropPointerEvents,
            transition: isDragging ? 'none' : 'opacity 0.28s ease-out'
          }}
          className="fixed inset-0 z-40 bg-black backdrop-blur-xs"
          onClick={closeSidebar}
        />
      )}

      {/* Render Sidebar on mobile (always in DOM for smooth sliding) or on desktop if open */}
      {(isMobile || isOpen) && sidebarContent}

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

      {/* Quota Modal */}
      {showQuotaModal && (
        <QuotaModal
          isOpen={showQuotaModal}
          onClose={() => setShowQuotaModal(false)}
        />
      )}

      {/* Settings Modal (Completely Opaque) */}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </>
  );
}
