import { useEffect } from 'react';
import { useQuota } from '@/hooks/useQuota';
import { useLanguage } from '@/context/LanguageContext';
import { PieChart, RefreshCw } from 'lucide-react';

export function QuotaPanel() {
  const { output, loading, refresh } = useQuota();
  const { t } = useLanguage();

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <PieChart className="w-5 h-5 text-primary" />
          <span>{t('quotaTitleText')}</span>
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('refreshQuota')}</span>
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-xs font-mono border border-border rounded-lg p-3 bg-card/60 min-h-[100px] text-foreground">
        {loading && !output ? t('loadingQuota') : output || t('noRulesYet')}
      </pre>
    </div>
  );
}
