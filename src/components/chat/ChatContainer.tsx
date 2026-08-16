import { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConversation } from '@/hooks/useConversation';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { Folder } from 'lucide-react';

// Code-split the WebTTY component — xterm.js + CSS is heavy and only
// needed when the user opens the terminal fallback.
const WebTTYModal = lazy(() =>
  import('../tui/WebTTYModal').then((m) => ({ default: m.WebTTYModal }))
);

const MODELS = [
  'Gemini 3.7 Flash (High)',
  'Gemini 3.7 Flash (Medium)',
  'Gemini 3.7 Flash (Low)',
  'Claude Sonnet 4.6 (Thinking)',
  'Claude Opus 4.6 (Thinking)',
  'GPT-OSS 120B (Medium)'
];

export function ChatContainer({ conversationId }: { conversationId: string }) {
  const [searchParams] = useSearchParams();
  const workspaceParam = searchParams.get('workspace') || undefined;

  const {
    messages,
    status,
    send,
    cancel,
    interactivePrompt,
    clearInteractivePrompt,
    refresh
  } = useConversation(conversationId);
  const [model, setModel] = useState(MODELS[0]);
  const [showTty, setShowTty] = useState(false);

  const cleanWorkspaceDisplay = workspaceParam?.startsWith('file://')
    ? workspaceParam.replace('file://', '')
    : workspaceParam;

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-border p-3 flex items-center gap-3">
        {cleanWorkspaceDisplay && (
          <div
            title={`Workspace: ${cleanWorkspaceDisplay}`}
            className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 border px-2 py-1 rounded max-w-[200px] truncate"
          >
            <Folder className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{cleanWorkspaceDisplay.split('/').filter(Boolean).slice(-2).join('/')}</span>
          </div>
        )}
        <span className="text-sm text-muted-foreground mr-1">Model:</span>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="border border-input rounded px-2 py-1 text-sm bg-background"
        >
          {MODELS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <button
          onClick={() => setShowTty(true)}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 hover:bg-accent"
        >
          Open WebTTY
        </button>
        <span className="text-xs text-muted-foreground">{status}</span>
      </div>
      <MessageList messages={messages} />
      {interactivePrompt && (
        <div className="bg-amber-500/10 border-t border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
          <span>⚠️ 当前任务可能需要交互式输入或权限确认</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTty(true)}
              className="px-2.5 py-1 bg-amber-500 text-white rounded font-medium hover:bg-amber-600 transition-colors"
            >
              打开 WebTTY 接管
            </button>
            <button
              onClick={() => clearInteractivePrompt()}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              忽略
            </button>
          </div>
        </div>
      )}
      <ChatInput
        onSend={(text) => send(text, model, workspaceParam)}
        onCancel={cancel}
        status={status}
      />
      {showTty && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-background flex items-center justify-center text-muted-foreground">Loading WebTTY…</div>}>
          <WebTTYModal
            conversationId={conversationId}
            onClose={() => {
              setShowTty(false);
              clearInteractivePrompt();
              // Re-sync conversations state — TUI may have produced new turns
              refresh();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
