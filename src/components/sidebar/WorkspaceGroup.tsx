import { useState } from 'react';
import { ConversationItem } from './ConversationItem';
import type { ConversationSummary } from '@/lib/types';

export function WorkspaceGroup({
  workspace,
  conversations
}: {
  workspace: string;
  conversations: ConversationSummary[];
}) {
  const [open, setOpen] = useState(true);
  const display = workspace.startsWith('file://') ? workspace.replace('file://', '') : workspace;

  return (
    <div className="mb-2">
      <button
        className="w-full text-left text-sm font-medium px-2 py-1 rounded hover:bg-accent"
        onClick={() => setOpen(!open)}
      >
        {open ? '▼' : '▶'} {display.split('/').slice(-2).join('/')}
      </button>
      {open && (
        <div className="ml-3 mt-1">
          {conversations.map((c) => (
            <ConversationItem key={c.conversation_id} conv={c} />
          ))}
        </div>
      )}
    </div>
  );
}
