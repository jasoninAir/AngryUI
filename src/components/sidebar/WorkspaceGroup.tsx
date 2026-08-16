import { useState } from 'react';
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
  const [open, setOpen] = useState(true);
  const display = workspace.startsWith('file://') ? workspace.replace('file://', '') : workspace;
  const folderName = display.split('/').filter(Boolean).slice(-2).join('/') || display;

  return (
    <div className="mb-2.5">
      <button
        className="w-full text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 px-2 py-1 rounded hover:bg-accent/50 flex items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        <span className="truncate flex items-center gap-1.5">
          <span className="text-[10px]">{open ? '▼' : '▶'}</span>
          <span>{folderName}</span>
        </span>
        <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded text-muted-foreground shrink-0">
          {conversations.length}
        </span>
      </button>
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
