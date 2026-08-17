import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

export function ThoughtAccordion({ thought }: { thought?: any }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!thought) return null;

  const formattedThought =
    typeof thought === 'string'
      ? thought
      : (() => {
          try {
            return JSON.stringify(thought, null, 2);
          } catch {
            return String(thought);
          }
        })();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(formattedThought);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="border border-border/70 rounded-xl p-2.5 my-1.5 text-xs bg-muted/30 mb-2.5 transition-all">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-muted-foreground hover:text-foreground text-[11px] font-medium cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-primary" /> : <ChevronRight className="w-3.5 h-3.5 text-primary" />}
          <Sparkles className="w-3.5 h-3.5 text-amber-500/80" />
          <span className="font-semibold text-foreground/80">Thinking Process</span>
        </div>
        <div className="flex items-center gap-2">
          {open && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground bg-background/80 hover:bg-background px-1.5 py-0.5 rounded transition-colors cursor-pointer border border-border/50"
              title="Copy thinking process"
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
          )}
          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
            {open ? 'Hide' : 'Show'}
          </span>
        </div>
      </button>

      {open && (
        <div className="mt-2 border-t border-border/60 pt-2">
          <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground leading-relaxed font-mono break-words max-h-72 overflow-y-auto p-1 selection:bg-primary/20">
            {formattedThought}
          </pre>
        </div>
      )}
    </div>
  );
}
