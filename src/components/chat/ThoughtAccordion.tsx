import { useState } from 'react';

export function ThoughtAccordion({ thought }: { thought: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded p-2 my-1 text-sm">
      <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground">
        {open ? '▼' : '▶'} Thinking
      </button>
      {open && <pre className="mt-1 whitespace-pre-wrap text-xs">{thought}</pre>}
    </div>
  );
}
