import { useState } from 'react';

export function ThoughtAccordion({ thought }: { thought?: any }) {
  const [open, setOpen] = useState(false);

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

  return (
    <div className="border border-border/80 rounded-lg p-2 my-1 text-xs bg-background/50 mb-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-[11px] font-medium cursor-pointer select-none"
      >
        <span className="text-[10px] text-muted-foreground font-bold">{open ? '▼' : '▶'}</span>
        <span>Thinking Process</span>
      </button>
      {open && (
        <pre className="mt-2 whitespace-pre-wrap text-[11px] text-muted-foreground leading-relaxed border-t border-border/60 pt-2 font-mono break-all max-h-60 overflow-y-auto">
          {formattedThought}
        </pre>
      )}
    </div>
  );
}
