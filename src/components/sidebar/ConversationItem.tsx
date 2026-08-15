import { Link } from 'react-router-dom';
import type { ConversationSummary } from '@/lib/types';

export function ConversationItem({ conv }: { conv: ConversationSummary }) {
  return (
    <Link
      to={`/chat/${conv.conversation_id}`}
      className="block rounded px-2 py-1.5 text-sm hover:bg-accent flex items-center justify-between"
    >
      <span className="truncate">{conv.title || conv.conversation_id.slice(0, 8)}</span>
      <span className="text-xs text-muted-foreground">{conv.step_count} steps</span>
    </Link>
  );
}
