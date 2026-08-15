import { useState } from 'react';
import { useConversation } from '@/hooks/useConversation';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

const MODELS = [
  'Gemini 3.7 Flash (High)',
  'Gemini 3.7 Flash (Medium)',
  'Gemini 3.7 Flash (Low)',
  'Claude Sonnet 4.6 (Thinking)',
  'Claude Opus 4.6 (Thinking)',
  'GPT-OSS 120B (Medium)'
];

export function ChatContainer({ conversationId }: { conversationId: string }) {
  const { messages, status, send, cancel } = useConversation(conversationId);
  const [model, setModel] = useState(MODELS[0]);

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-border p-3 flex items-center gap-3">
        <span className="text-sm text-muted-foreground mr-2">Model:</span>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="border border-input rounded px-2 py-1 text-sm"
        >
          {MODELS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">{status}</span>
      </div>
      <MessageList messages={messages} />
      <ChatInput onSend={(text) => send(text, model)} onCancel={cancel} status={status} />
    </div>
  );
}
