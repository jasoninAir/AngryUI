import { useState } from 'react';

export function ToolCard({ name, input, output }: { name: string; input: any; output: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded p-2 my-1 text-sm">
      <button onClick={() => setOpen(!open)} className="font-mono">
        {open ? '▼' : '▶'} {name}
      </button>
      {open && (
        <div className="mt-1 text-xs">
          <div className="text-muted-foreground">Input:</div>
          <pre className="whitespace-pre-wrap">{JSON.stringify(input, null, 2)}</pre>
          {output && (
            <>
              <div className="text-muted-foreground mt-2">Output:</div>
              <pre className="whitespace-pre-wrap">{output}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
