import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';

export function ChatInput({
  onSend,
  onCancel,
  status
}: {
  onSend: (text: string) => void;
  onCancel: () => void;
  status: 'IDLE' | 'RUNNING' | 'PAUSED';
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea height dynamically up to max 40vh of page height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height temporarily to recalculate accurate scrollHeight on shrink/delete
    textarea.style.height = 'auto';
    const maxHeight = Math.floor(window.innerHeight * 0.4);
    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${Math.max(44, scrollHeight)}px`;
      textarea.style.overflowY = 'hidden';
    }
  }, [text]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim() && status === 'IDLE') {
        onSend(text.trim());
        setText('');
      }
    }
  };

  return (
    <div className="border-t border-border bg-card/60 p-3 flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
        rows={1}
        className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60 min-h-[44px] max-h-[40vh] leading-relaxed transition-[height] duration-75"
      />
      {status === 'RUNNING' ? (
        <button
          onClick={onCancel}
          className="h-11 px-4 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 cursor-pointer"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Stop</span>
        </button>
      ) : (
        <button
          onClick={() => {
            if (text.trim()) {
              onSend(text.trim());
              setText('');
            }
          }}
          disabled={!text.trim()}
          className="h-11 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 shadow-sm cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      )}
    </div>
  );
}
