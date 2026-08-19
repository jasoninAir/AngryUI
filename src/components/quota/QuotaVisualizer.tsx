import { useEffect, useState, useCallback } from 'react';
import { useQuota } from '@/hooks/useQuota';
import { useLanguage } from '@/context/LanguageContext';
import { Gauge, RefreshCw, Clock, AlertTriangle, Code, Layers } from 'lucide-react';

export interface QuotaBucket {
  id: string;
  name: string;
  description: string;
  window: string;
  remaining_fraction: number; // 0.0 to 1.0
  reset_time?: string;
}

export interface QuotaGroup {
  name: string;
  description: string;
  buckets: QuotaBucket[];
}

export interface ParsedQuotaData {
  description?: string;
  groups: QuotaGroup[];
}

/**
 * Parse Antigravity quota stream JSON
 */
function parseQuotaJson(raw: string): { data: ParsedQuotaData | null; rawText: string } {
  if (!raw?.trim()) return { data: null, rawText: '' };

  try {
    const lines = raw.trim().split('\n');
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        const data = obj.command?.data || obj.result?.command?.data;
        if (data && Array.isArray(data.groups)) {
          return { data, rawText: raw };
        }
        if (obj.groups && Array.isArray(obj.groups)) {
          return { data: obj, rawText: raw };
        }
      } catch {}
    }

    // Direct JSON parse fallback
    const parsed = JSON.parse(raw);
    if (parsed.groups && Array.isArray(parsed.groups)) {
      return { data: parsed, rawText: raw };
    }
  } catch {}

  return { data: null, rawText: raw };
}

function getRemainingColor(fraction: number): {
  category: 'emerald' | 'amber' | 'rose';
  percentage: number;
} {
  const percentage = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  let category: 'emerald' | 'amber' | 'rose';
  if (percentage >= 40) {
    category = 'emerald';
  } else if (percentage >= 15) {
    category = 'amber';
  } else {
    category = 'rose';
  }
  return { category, percentage };
}

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const target = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = target - now;
    if (diffMs <= 0) return 'Reset imminent';
    const diffMins = Math.round(diffMs / (1000 * 60));
    if (diffMins < 60) return `in ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    const remMins = diffMins % 60;
    if (diffHours < 24) return `in ${diffHours}h ${remMins}m`;
    const diffDays = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;
    return `in ${diffDays}d ${remHours}h`;
  } catch {
    return '';
  }
}

export function QuotaVisualizer({ autoRefresh = false, onRefresh }: { autoRefresh?: boolean; onRefresh?: () => void }) {
  const { output, loading, refresh } = useQuota();
  const { t } = useLanguage();
  const [quotaData, setQuotaData] = useState<ParsedQuotaData | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [showRaw, setShowRaw] = useState(false);

  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      refresh();
    }
  }, [refresh, onRefresh]);

  useEffect(() => {
    if (autoRefresh) {
      handleRefresh();
    }
  }, [autoRefresh, handleRefresh]);

  useEffect(() => {
    if (output) {
      const { data, rawText: text } = parseQuotaJson(output);
      setQuotaData(data);
      setRawText(text);
    }
  }, [output]);

  return (
    <div className="space-y-4 text-foreground select-none">
      {/* Top action toolbar */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">{t('quotaTitleText')}</h3>
            <p className="text-[11px] text-muted-foreground">Real-time model tier limits & remaining allowance</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowRaw(!showRaw)}
            title={showRaw ? 'Show visual bars' : 'Show raw output'}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
              showRaw
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent border border-border/60'
            }`}
          >
            {showRaw ? <Layers className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            title={t('refreshQuota')}
            className="p-1.5 px-2.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-accent disabled:opacity-50 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('refreshQuota')}</span>
          </button>
        </div>
      </div>

      {loading && !quotaData && !rawText && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs">{t('loadingQuota')}</span>
        </div>
      )}

      {showRaw ? (
        <pre className="whitespace-pre-wrap text-[11px] font-mono border border-border rounded-xl p-3 bg-muted/40 max-h-[360px] overflow-y-auto text-foreground">
          {rawText || (loading ? t('loadingQuota') : t('noRulesYet'))}
        </pre>
      ) : quotaData && quotaData.groups.length > 0 ? (
        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          {quotaData.groups.map((group, gIdx) => (
            <div
              key={gIdx}
              className="rounded-xl border border-border bg-card/60 p-3.5 shadow-2xs space-y-3"
            >
              {/* Group Header */}
              <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>{group.name}</span>
                  </h4>
                  {group.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{group.description}</p>
                  )}
                </div>
              </div>

              {/* Group Buckets */}
              <div className="space-y-2.5">
                {(group.buckets || []).map((bucket, bIdx) => {
                  const fraction = typeof bucket.remaining_fraction === 'number' ? bucket.remaining_fraction : 1;
                  const { category, percentage } = getRemainingColor(fraction);
                  const resetCountdown = formatRelativeTime(bucket.reset_time);

                  const barColors = {
                    emerald: 'bg-emerald-500',
                    amber: 'bg-amber-500',
                    rose: 'bg-rose-500'
                  };

                  const textColors = {
                    emerald: 'text-emerald-600 dark:text-emerald-400',
                    amber: 'text-amber-600 dark:text-amber-400',
                    rose: 'text-rose-600 dark:text-rose-400'
                  };

                  return (
                    <div key={bIdx} className="space-y-1 bg-background/50 rounded-lg p-2.5 border border-border/40">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground text-[11px]">{bucket.name}</span>
                        <div className="flex items-center gap-2">
                          {resetCountdown && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded font-mono">
                              <Clock className="w-2.5 h-2.5" />
                              {resetCountdown}
                            </span>
                          )}
                          <span className={`font-mono font-bold text-xs ${textColors[category]}`}>
                            {percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Visual progress bar */}
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColors[category]}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {bucket.description && (
                        <p className="text-[10px] text-muted-foreground/80 leading-relaxed pt-0.5">
                          {bucket.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
          <AlertTriangle className="w-7 h-7 text-amber-500/80" />
          <p className="text-xs text-center">{rawText || t('noRulesYet')}</p>
        </div>
      ) : null}
    </div>
  );
}
