import { useState } from 'react';
import { Copy, Check, Wrench, ChevronDown, ChevronRight } from 'lucide-react';
import { sanitizeOutputText } from '@/lib/textSanitizer';

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground bg-muted/80 hover:bg-muted px-1.5 py-0.5 rounded transition-colors cursor-pointer"
      title="Copy"
    >
      {copied ? (
        <>
          <Check className="w-2.5 h-2.5 text-emerald-500" />
          <span className="text-emerald-500">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-2.5 h-2.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

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
  const formattedInput = sanitizeOutputText(formatContent(input));
  const formattedOutput = sanitizeOutputText(formatContent(output));

  return (
    <div className="border border-border/80 rounded-xl p-2.5 my-1.5 text-xs bg-card/60 shadow-2xs font-mono transition-all">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-muted-foreground hover:text-foreground font-medium cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5 truncate">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-primary" /> : <ChevronRight className="w-3.5 h-3.5 text-primary" />}
          <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-foreground font-semibold text-[11px] truncate">{displayName}</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-sans px-1.5 py-0.5 bg-muted/50 rounded-md">
          {open ? 'Collapse' : 'Details'}
        </span>
      </button>

      {open && (
        <div className="mt-2.5 space-y-2 border-t border-border/60 pt-2.5 text-[11px]">
          {formattedInput && (
            <div>
              <div className="flex items-center justify-between text-muted-foreground text-[10px] uppercase font-semibold mb-1">
                <span>Input</span>
                <CopyBtn text={formattedInput} />
              </div>
              <pre className="whitespace-pre-wrap bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg p-2.5 text-[11.5px] leading-relaxed break-all max-h-64 overflow-y-auto">
                {formattedInput}
              </pre>
            </div>
          )}
          {formattedOutput && (
            <div>
              <div className="flex items-center justify-between text-muted-foreground text-[10px] uppercase font-semibold mb-1">
                <span>Output</span>
                <CopyBtn text={formattedOutput} />
              </div>
              <pre className="whitespace-pre-wrap bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg p-2.5 text-[11.5px] leading-relaxed break-all max-h-72 overflow-y-auto">
                {formattedOutput}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
