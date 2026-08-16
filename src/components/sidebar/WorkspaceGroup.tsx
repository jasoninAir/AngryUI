import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { ConversationItem } from './ConversationItem';
import type { ConversationSummary } from '@/lib/types';

interface WorkspaceGroupProps {
  workspace: string;
  conversations: ConversationSummary[];
  activeConversationId?: string;
  onRename: (id: string, newTitle: string) => Promise<boolean>;
  onArchive: (id: string, isArchived: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function WorkspaceGroup({
  workspace,
  conversations,
  activeConversationId,
  onRename,
  onArchive,
  onDelete
}: WorkspaceGroupProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const display = workspace.startsWith('file://') ? workspace.replace('file://', '') : workspace;
  const folderName = display.split('/').filter(Boolean).slice(-2).join('/') || display;

  const handleCreateSession = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newId = crypto.randomUUID();
    const cleanWorkspace = workspace.startsWith('file://') ? workspace.replace('file://', '') : workspace;
    navigate(`/chat/${newId}?workspace=${encodeURIComponent(cleanWorkspace)}`);
  };

  return (
    <div className="mb-2.5">
      <div
        className="group/groupheader w-full text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 px-2 py-1 rounded hover:bg-accent/50 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <span className="truncate flex items-center gap-1.5 flex-1 min-w-0" title={display}>
          <span className="text-[10px]">{open ? '▼' : '▶'}</span>
          <span className="truncate">{folderName}</span>
        </span>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {/* New session in this workspace button */}
          <button
            onClick={handleCreateSession}
            title={`在 ${folderName} 目录下新建会话`}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded text-muted-foreground">
            {conversations.length}
          </span>
        </div>
      </div>

      {open && (
        <div className="mt-1 space-y-0.5 pl-1">
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
        </div>
      )}
    </div>
  );
}
