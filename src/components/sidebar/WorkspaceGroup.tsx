import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, MessageSquarePlus, Pin, Folder, Pencil, Check, X, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useLanguage } from '@/context/LanguageContext';
import { ConversationItem } from './ConversationItem';
import { generateUUID } from '@/lib/uuid';
import type { ConversationSummary } from '@/lib/types';

interface WorkspaceGroupProps {
  workspace: string;
  alias?: string;
  conversations: ConversationSummary[];
  probes?: ConversationSummary[];
  activeConversationId?: string;
  isPinned?: boolean;
  onTogglePin?: (workspace: string) => void;
  onRename: (id: string, newTitle: string) => Promise<boolean>;
  onArchive: (id: string, isArchived: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onSaveAlias?: (workspace: string, alias: string) => Promise<boolean>;
  onClearProbes?: (workspace: string) => Promise<void>;
}

export function WorkspaceGroup({
  workspace,
  alias,
  conversations,
  probes = [],
  activeConversationId,
  isPinned = false,
  onTogglePin,
  onRename,
  onArchive,
  onDelete,
  onSaveAlias,
  onClearProbes
}: WorkspaceGroupProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, closeSidebar } = useSidebar();
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);
  const [showProbes, setShowProbes] = useState(false);
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState(alias || '');

  const display = workspace.startsWith('file://') ? workspace.replace('file://', '') : workspace;
  const folderName = display.split('/').filter(Boolean).slice(-2).join('/') || display;
  const titleName = alias || folderName;

  const handleCreateSession = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newId = generateUUID();
    const cleanWorkspace = workspace.startsWith('file://') ? workspace.replace('file://', '') : workspace;
    if (isMobile) closeSidebar();
    navigate(`/chat/${newId}?workspace=${encodeURIComponent(cleanWorkspace)}`);
  };

  const handleSaveAlias = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onSaveAlias) {
      await onSaveAlias(workspace, aliasInput.trim());
    }
    setIsEditingAlias(false);
  };

  const handleCancelAlias = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setAliasInput(alias || '');
    setIsEditingAlias(false);
  };

  const handleClearProbes = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onClearProbes) {
      await onClearProbes(workspace);
    }
  };

  // Check if current active route is a brand new session for this workspace
  const isCurrentNewSessionWorkspace = Boolean(
    activeConversationId &&
      !conversations.some((c) => c.conversation_id === activeConversationId) &&
      !probes.some((p) => p.conversation_id === activeConversationId) &&
      (location.search.includes(encodeURIComponent(display)) || location.search.includes(encodeURIComponent(workspace)))
  );

  return (
    <div className="mb-2.5">
      <div
        className={`group/groupheader w-full text-left text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded flex items-center justify-between cursor-pointer select-none transition-colors ${
          isPinned
            ? 'bg-primary/5 hover:bg-primary/10 text-foreground font-bold'
            : 'text-muted-foreground/80 hover:bg-accent/50'
        }`}
        onClick={() => !isEditingAlias && setOpen(!open)}
      >
        {isEditingAlias ? (
          <form
            onSubmit={handleSaveAlias}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 flex-1 min-w-0 pr-1"
          >
            <input
              type="text"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder={t('projectAliasPlaceholder')}
              autoFocus
              className="bg-background border border-primary/50 text-foreground text-xs rounded px-1.5 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-primary font-normal normal-case"
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancelAlias();
              }}
            />
            <button
              type="submit"
              onClick={handleSaveAlias}
              className="p-1 text-emerald-500 hover:text-emerald-600 cursor-pointer shrink-0"
              title={t('save')}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCancelAlias}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              title={t('cancel')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <span className="truncate flex items-center gap-1.5 flex-1 min-w-0" title={display}>
            <span className="text-[10px] text-muted-foreground">{open ? '▼' : '▶'}</span>
            {isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
            <span className="truncate normal-case font-semibold text-foreground/90">{titleName}</span>
          </span>
        )}

        {!isEditingAlias && (
          <div className="flex items-center gap-0.5 shrink-0 ml-1">
            {/* Rename Project Alias Button */}
            {onSaveAlias && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAliasInput(alias || '');
                  setIsEditingAlias(true);
                }}
                title={t('renameProject')}
                className="opacity-0 group-hover/groupheader:opacity-100 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-background/80 transition-opacity cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}

            {/* Pin / Unpin Button */}
            {onTogglePin && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTogglePin(workspace);
                }}
                title={isPinned ? t('unpinWorkspace') : t('pinWorkspace')}
                className={`p-0.5 rounded transition-colors cursor-pointer ${
                  isPinned
                    ? 'text-amber-500 hover:text-amber-600'
                    : 'opacity-0 group-hover/groupheader:opacity-100 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Pin className={`w-3 h-3 ${isPinned ? 'fill-amber-500' : ''}`} />
              </button>
            )}

            {/* New session in this workspace button */}
            <button
              onClick={handleCreateSession}
              title={`${t('newSession')} (${titleName})`}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded text-muted-foreground font-mono">
              {conversations.length}
            </span>
          </div>
        )}
      </div>

      {open && (
        <div className="mt-1 space-y-0.5 pl-1">
          {isCurrentNewSessionWorkspace && (
            <div className="rounded px-2 py-1.5 text-xs flex items-center gap-1.5 bg-accent text-accent-foreground font-medium border border-primary/30 my-0.5 animate-in fade-in">
              <MessageSquarePlus className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{t('newSession')}...</span>
            </div>
          )}

          {conversations.length === 0 && !isCurrentNewSessionWorkspace && (
            <div
              onClick={() => handleCreateSession()}
              className="rounded px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 border border-dashed border-border/70 my-1 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Folder className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span className="text-[11px] truncate">{t('noSessionsClickToStart')}</span>
              </div>
              <Plus className="w-3 h-3 opacity-80 shrink-0" />
            </div>
          )}

          {conversations.map((c) => (
            <ConversationItem
              key={c.conversation_id}
              conv={c}
              isActive={c.conversation_id === activeConversationId}
              onRename={onRename}
              onArchive={onArchive}
              onDelete={onDelete}
            />
          ))}

          {/* Ephemeral Probes / Test Sessions Collapsible Footer */}
          {probes.length > 0 && (
            <div className="pt-1.5 mt-1 border-t border-border/40">
              <div
                className="flex items-center justify-between px-2 py-1 text-[11px] text-muted-foreground/70 hover:text-foreground cursor-pointer rounded select-none group/probe"
                onClick={() => setShowProbes(!showProbes)}
              >
                <span className="flex items-center gap-1">
                  {showProbes ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <span>{t('probesAndEphemeral')} ({probes.length})</span>
                </span>

                {onClearProbes && (
                  <button
                    onClick={handleClearProbes}
                    title={t('clearProbes')}
                    className="opacity-0 group-hover/probe:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {showProbes && (
                <div className="pl-1 space-y-0.5 opacity-75 mt-0.5">
                  {probes.map((p) => (
                    <ConversationItem
                      key={p.conversation_id}
                      conv={p}
                      isActive={p.conversation_id === activeConversationId}
                      onRename={onRename}
                      onArchive={onArchive}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
