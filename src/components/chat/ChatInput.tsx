import { useState, KeyboardEvent } from 'react';

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
    <div className="border-t border-border p-3 flex gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
        rows={2}
        className="flex-1 resize-none rounded border border-input bg-background px-3 py-2 text-sm"
      />
      {status === 'RUNNING' ? (
        <button
          onClick={onCancel}
          className="rounded bg-destructive text-destructive-foreground px-4"
        >
          Stop
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
          className="rounded bg-primary text-primary-foreground px-4 disabled:opacity-50"
        >
          Send
        </button>
      )}
    </div>
  );
}
