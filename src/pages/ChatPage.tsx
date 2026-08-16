import { useParams } from 'react-router-dom';
import { ChatContainer } from '@/components/chat/ChatContainer';

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  if (!conversationId) return <div className="p-8 text-muted-foreground text-sm">No conversation selected</div>;
  return <ChatContainer key={conversationId} conversationId={conversationId} />;
}
