import { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';

export function MessageList({ messages }: { messages: any[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center text-xs text-muted-foreground">
        <div>
          <p>暂无对话消息</p>
          <p className="mt-1 opacity-70">在下方输入内容开始对话，或点击右上角「Load History」加载历史记录</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="h-full overflow-y-auto p-4 space-y-3">
      {messages.map((m) => (
        <MessageItem key={m.id} msg={m} />
      ))}
    </div>
  );
}
