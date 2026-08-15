import { useParams } from 'react-router-dom';
import { ChatContainer } from '@/components/chat/ChatContainer';

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  if (!conversationId) return <div>No conversation selected</div>;
  return <ChatContainer conversationId={conversationId} />;
}
