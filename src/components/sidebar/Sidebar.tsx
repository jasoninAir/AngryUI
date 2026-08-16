import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useProjectIndex } from '@/hooks/useProjectIndex';
import { useSidebar } from '@/context/SidebarContext';
import { WorkspaceGroup } from './WorkspaceGroup';
import { NewSessionModal } from './NewSessionModal';
import { Archive, RefreshCw, Settings, Plus, PanelLeftClose } from 'lucide-react';

export function Sidebar() {
  const location = useLocation();
  const { isOpen, isMobile, closeSidebar, toggleSidebar } = useSidebar();
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

  // Extract active conversationId from route /chat/:id
  const match = location.pathname.match(/^\/chat\/([^/]+)/);
  const activeConversationId = match ? match[1] : undefined;

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
          <h2 className="text-base font-bold tracking-tight truncate">AGY WebUI</h2>
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
            title="新建会话 / 指定项目路径"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          {/* Refresh Button */}
          <button
            onClick={() => refresh()}
            disabled={loading}
            title="刷新会话列表"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {/* Settings Button */}
          <Link
            to="/settings"
            onClick={() => {
              if (isMobile) closeSidebar();
            }}
            title="设置"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>
          {/* Collapse Sidebar Button */}
          <button
            onClick={toggleSidebar}
            title="收起侧边栏"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-0.5"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Scrollable Projects & Conversations */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {groups.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <p>暂无会话</p>
            <button
              onClick={() => setShowNewSessionModal(true)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3 h-3" /> 点击新建第一个会话
            </button>
          </div>
        ) : (
          groups.map((g) => (
            <div
              key={g.workspace}
              onClick={() => {
                // If on mobile and clicking conversation link inside group, close drawer
                if (isMobile) {
                  // Keep open on group header toggle, close on conversation item click
                }
              }}
            >
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

      {/* Bottom Footer: Archive Filter & Status */}
      <div className="p-2 border-t border-border bg-background/50 flex flex-col gap-1.5 text-xs">
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors ${
              showArchived
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5" />
              <span>{showArchived ? '隐藏已归档会话' : '显示已归档会话'}</span>
            </span>
            <span className="font-mono text-[11px] bg-background border px-1.5 py-0.2 rounded">
              {archivedCount}
            </span>
          </button>
        )}
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
