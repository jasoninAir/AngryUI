import { useState } from 'react';

export function ToolCard({ name, input, output }: { name?: string; input?: any; output?: any }) {
  const [open, setOpen] = useState(false);

  const formatContent = (val: any): string => {
    if (val === undefined || val === null) return '';
    if (typeof val === 'string') return val;
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  };

  const displayName = name || 'tool_call';
  const formattedInput = formatContent(input);
  const formattedOutput = formatContent(output);

  return (
    <div className="border border-border rounded-lg p-2.5 my-1 text-xs bg-card/40 shadow-2xs font-mono">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium cursor-pointer select-none"
      >
        <span className="text-[10px] text-primary font-bold">{open ? '▼' : '▶'}</span>
        <span className="text-foreground">{displayName}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 border-t border-border/60 pt-2 text-[11px]">
          {formattedInput && (
            <div>
              <div className="text-muted-foreground text-[10px] uppercase font-semibold">Input:</div>
              <pre className="mt-0.5 whitespace-pre-wrap bg-background border border-border/80 rounded p-2 text-foreground break-all max-h-60 overflow-y-auto">
                {formattedInput}
              </pre>
            </div>
          )}
          {formattedOutput && (
            <div>
              <div className="text-muted-foreground text-[10px] uppercase font-semibold">Output:</div>
              <pre className="mt-0.5 whitespace-pre-wrap bg-background border border-border/80 rounded p-2 text-foreground break-all max-h-60 overflow-y-auto">
                {formattedOutput}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
