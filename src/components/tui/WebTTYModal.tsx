import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

const VIRTUAL_KEYS: Array<{ label: string; input: string; minW?: number }> = [
  { label: 'Esc',   input: '\x1b',     minW: 58 },
  { label: 'Tab',   input: '\t',        minW: 58 },
  { label: 'Ctrl+C',input: '\x03',      minW: 58 },
  { label: 'Ctrl+D',input: '\x04',      minW: 58 },
  { label: 'Ctrl+W',input: '\x17',      minW: 58 },
  { label: '↑',     input: '\x1b[A',   minW: 44 },
  { label: '↓',     input: '\x1b[B',   minW: 44 },
  { label: '←',     input: '\x1b[D',   minW: 44 },
  { label: '→',     input: '\x1b[C',   minW: 44 },
  { label: 'PgUp',  input: '\x1b[5~', minW: 58 },
  { label: 'PgDn',  input: '\x1b[6~', minW: 58 },
  { label: 'Enter',  input: '\r',       minW: 58 },
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
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="border-b border-border px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-sm">WebTTY — {conversationId.slice(0, 8)}</span>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
          Exit TTY
        </button>
      </div>
      <div ref={ref} className="flex-1" />
      {/* Mobile virtual keys bar — essential for touch devices since
          soft-keyboards lack Esc / Tab / arrows / Ctrl+C. */}
      <div className="border-t border-border px-2 py-2 pb-safe flex gap-1 overflow-x-auto md:hidden">
        {VIRTUAL_KEYS.map((k) => (
          <button
            key={k.label}
            onTouchStart={(e) => {
              e.preventDefault();
              sendKey(k.input);
            }}
            onClick={() => sendKey(k.input)}
            className={`shrink-0 h-[44px] text-xs font-mono border border-border rounded bg-secondary text-secondary-foreground active:opacity-60 ${k.minW ? '' : ''}`}
            style={{ minWidth: k.minW ?? 58 }}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}
