import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

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

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="border-b border-border px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-sm">WebTTY — {conversationId.slice(0, 8)}</span>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
          Exit TTY
        </button>
      </div>
      <div ref={ref} className="flex-1" />
    </div>
  );
}
