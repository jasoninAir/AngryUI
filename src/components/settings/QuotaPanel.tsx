import { useEffect } from 'react';
import { useQuota } from '@/hooks/useQuota';

export function QuotaPanel() {
  const { output, loading, refresh } = useQuota();

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Quota</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          ↻ Refresh
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-sm border border-border rounded p-3 bg-muted min-h-[120px]">
        {loading && !output ? 'Loading...' : output || 'No data yet.'}
      </pre>
    </div>
  );
}
