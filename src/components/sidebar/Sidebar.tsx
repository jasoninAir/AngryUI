import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useProjectIndex } from '@/hooks/useProjectIndex';
import { useSidebar } from '@/context/SidebarContext';
import { useLanguage, LANGUAGE_OPTIONS } from '@/context/LanguageContext';
import { WorkspaceGroup } from './WorkspaceGroup';
import { NewSessionModal } from './NewSessionModal';
import { Archive, RefreshCw, Settings, Plus, PanelLeftClose, Globe } from 'lucide-react';

export function Sidebar() {
  const location = useLocation();
  const { isOpen, isMobile, closeSidebar, toggleSidebar } = useSidebar();
  const { language, setLanguage, t } = useLanguage();
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
    <aside
      className={`h-screen bg-card border-r border-border flex flex-col justify-between select-none ${
        isMobile
          ? 'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200'
          : 'w-64 shrink-0 transition-all duration-200'
      }`}
    >
      {/* Top Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base font-bold tracking-tight truncate bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
            {t('brandTitle')}
          </h2>
          {totalCount > 0 && (
            <span className="text-[10px] bg-secondary text-secondary-foreground font-mono px-1.5 py-0.5 rounded shrink-0">
              {totalCount}
            </span>
          )}
        </div>
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
          {/* Settings Button */}
          <Link
            to="/settings"
            onClick={() => {
              if (isMobile) closeSidebar();
            }}
            title={t('settings')}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>
          {/* Collapse Sidebar Button */}
          <button
            onClick={toggleSidebar}
            title="Collapse Sidebar"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-0.5 cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Scrollable Projects & Conversations */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
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

      {/* Bottom Footer: Language Switcher, Archive Filter & Settings */}
      <div className="p-2.5 border-t border-border bg-card/40 flex flex-col gap-2 text-xs">
        {/* Archive toggle button */}
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors cursor-pointer ${
              showArchived
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5" />
              <span>{showArchived ? t('hideArchived') : t('showArchived')}</span>
            </span>
            <span className="font-mono text-[11px] bg-background border px-1.5 py-0.2 rounded">
              {archivedCount}
            </span>
          </button>
        )}

        {/* Language Switcher Selector */}
        <div className="flex items-center justify-between px-2 py-1 bg-background border border-border rounded-lg shadow-2xs">
          <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-medium">{t('language')}</span>
          </div>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="bg-transparent text-foreground text-xs font-medium focus:outline-none cursor-pointer py-0.5 pl-1"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code} className="bg-card text-foreground">
                {opt.flag} {opt.nativeName}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
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
