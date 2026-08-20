import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { getStoredToken } from '@/lib/auth';
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
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      theme: { background: '#18181b', foreground: '#f4f4f5' },
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.25
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current!);
    fit.fit();
    termRef.current = term;

    term.writeln('\x1b[90m[WebTTY] Connecting to Antigravity session...\x1b[0m');

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const token = getStoredToken();
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    const wsUrl = `${proto}://${location.host}/ws/tui/${encodeURIComponent(conversationId)}${query}`;
    const protocols = token ? ['bearer', token] : undefined;
    const ws = new WebSocket(wsUrl, protocols);
    wsRef.current = ws;

    const timeoutTimer = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        term.writeln('\r\n\x1b[33m[WebTTY] Still connecting... If this takes too long, verify your network or server status.\x1b[0m');
      }
    }, 6000);

    ws.onopen = () => {
      clearTimeout(timeoutTimer);
      setStatus('connected');
      term.writeln('\x1b[32m[WebTTY] Connected.\x1b[0m\r\n');
      ws.send(JSON.stringify({ type: 'tui:resize', cols: term.cols, rows: term.rows }));
      term.focus();
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'tui:data') term.write(msg.data);
        if (msg.type === 'tui:exit') {
          term.writeln('\r\n\x1b[90m[WebTTY] Session ended.\x1b[0m');
          setTimeout(() => onClose(), 800);
        }
      } catch {
        term.write(e.data);
      }
    };

    ws.onerror = () => {
      setStatus('error');
      term.writeln('\r\n\x1b[31m[WebTTY] Connection error. Please check authentication and host status.\x1b[0m');
    };

    ws.onclose = () => {
      setStatus('closed');
      term.writeln('\r\n\x1b[90m[WebTTY] Connection closed.\x1b[0m');
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'tui:input', data }));
      }
    });

    const handleResize = () => {
      try {
        fit.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'tui:resize', cols: term.cols, rows: term.rows }));
        }
      } catch {}
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try { ws.close(); } catch {}
      try { term.dispose(); } catch {}
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
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              status === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : status === 'connecting'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <span className="font-mono text-xs sm:text-sm font-medium">WebTTY — {conversationId.slice(0, 8)}</span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase">({status})</span>
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
