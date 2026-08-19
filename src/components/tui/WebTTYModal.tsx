import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

const VIRTUAL_KEYS: Array<{ label: string; input: string; minW?: number }> = [
  { label: 'Esc',    input: '\x1b',     minW: 48 },
  { label: 'Tab',    input: '\t',        minW: 48 },
  { label: 'Ctrl+C', input: '\x03',      minW: 56 },
  { label: 'Ctrl+D', input: '\x04',      minW: 56 },
  { label: 'Ctrl+L', input: '\x0c',      minW: 56 },
  { label: 'Ctrl+Z', input: '\x1a',      minW: 56 },
  { label: 'Ctrl+W', input: '\x17',      minW: 56 },
  { label: '↑',      input: '\x1b[A',   minW: 44 },
  { label: '↓',      input: '\x1b[B',   minW: 44 },
  { label: '←',      input: '\x1b[D',   minW: 44 },
  { label: '→',      input: '\x1b[C',   minW: 44 },
  { label: 'Home',   input: '\x1b[H',   minW: 50 },
  { label: 'End',    input: '\x1b[F',   minW: 50 },
  { label: 'PgUp',   input: '\x1b[5~', minW: 54 },
  { label: 'PgDn',   input: '\x1b[6~', minW: 54 },
  { label: '⌫ BS',   input: '\x7f',     minW: 52 },
  { label: 'Enter',  input: '\r',       minW: 56 },
];

export function WebTTYModal({
  conversationId,
  onClose
}: {
  conversationId: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const term = new Terminal({ cursorBlink: true, theme: { background: '#1e1e1e' } });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current!);
    fit.fit();
    termRef.current = term;

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws/tui/${conversationId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'tui:resize', cols: term.cols, rows: term.rows }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'tui:data') term.write(msg.data);
      if (msg.type === 'tui:exit') onClose();
    };
    term.onData((data) => {
      ws.send(JSON.stringify({ type: 'tui:input', data }));
    });

    const handleResize = () => {
      fit.fit();
      ws.send(JSON.stringify({ type: 'tui:resize', cols: term.cols, rows: term.rows }));
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [conversationId, onClose]);

  const sendKey = (input: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'tui:input', data: input }));
    }
    termRef.current?.focus();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`WebTTY terminal — ${conversationId.slice(0, 8)}`}
      className="fixed inset-0 z-50 bg-background flex flex-col font-sans select-none"
    >
      <div className="border-b border-border px-3 sm:px-4 py-2 flex items-center justify-between bg-card/60 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-xs sm:text-sm font-medium">WebTTY — {conversationId.slice(0, 8)}</span>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md border border-border hover:bg-accent transition-colors cursor-pointer"
        >
          Exit TTY (ESC)
        </button>
      </div>

      <div ref={ref} className="flex-1 bg-[#1e1e1e]" />

      {/* Mobile virtual keys bar — 44pt touch standard */}
      <div className="border-t border-border bg-card/80 px-2 py-2 pb-safe flex gap-1.5 overflow-x-auto md:hidden no-scrollbar shrink-0 shadow-lg">
        {VIRTUAL_KEYS.map((k) => (
          <button
            key={k.label}
            onTouchStart={(e) => {
              e.preventDefault();
              sendKey(k.input);
            }}
            onClick={() => sendKey(k.input)}
            className="shrink-0 h-[44px] text-xs font-mono font-semibold border border-border rounded-xl bg-secondary text-secondary-foreground hover:bg-accent active:scale-90 active:bg-primary/20 active:border-primary/50 transition-all flex items-center justify-center cursor-pointer shadow-xs"
            style={{ minWidth: k.minW ?? 52 }}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}
