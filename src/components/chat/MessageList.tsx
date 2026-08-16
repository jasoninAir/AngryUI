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
        <div className="space-y-1.5 animate-in fade-in duration-200">
          <p className="font-semibold text-sm text-foreground">✨ 新会话已就绪</p>
          <p className="opacity-70">在下方输入框中输入内容即可开始对话，模型将在指定工作区目录执行任务</p>
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
