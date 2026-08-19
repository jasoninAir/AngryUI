import { useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  PlusCircle,
  Terminal,
  X,
  ShieldCheck
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { findDangerMatches, getHighestDangerSeverity } from '@/lib/dangerCommands';

export interface PermissionPromptInfo {
  command?: string;
  tool?: string;
  [key: string]: any;
}

interface PermissionCardProps {
  prompt: PermissionPromptInfo;
  onAllowOnce: () => void;
  onAllowTemporary: () => void;
  onAddToWhitelist: () => void;
  onTakeoverTTY: () => void;
  onDeny: () => void;
}

export function PermissionCard({
  prompt,
  onAllowOnce,
  onAllowTemporary,
  onAddToWhitelist,
  onTakeoverTTY,
  onDeny
}: PermissionCardProps) {
  const { t } = useLanguage();
  const command = prompt.command || '';

  const dangerMatches = useMemo(() => findDangerMatches(command), [command]);
  const highestSeverity = useMemo(() => getHighestDangerSeverity(dangerMatches), [dangerMatches]);

  const isCritical = highestSeverity === 'critical';
  const isHigh = highestSeverity === 'high';
  const hasDanger = dangerMatches.length > 0;

  return (
    <div
      className={`rounded-2xl p-4 mx-3 mb-2 flex flex-col gap-3 shadow-md transition-all text-xs shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-200 border ${
        isCritical
          ? 'bg-rose-500/10 border-rose-500/40 dark:bg-rose-950/30'
          : isHigh
          ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-950/30'
          : 'bg-card border-border/80'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          {isCritical ? (
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse">
              <Flame className="w-4 h-4" />
            </div>
          ) : isHigh ? (
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
              <ShieldAlert className="w-4 h-4" />
            </div>
          )}

          <div className="flex flex-col">
            <span
              className={`text-xs font-semibold ${
                isCritical
                  ? 'text-rose-600 dark:text-rose-400'
                  : isHigh
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-foreground'
              }`}
            >
              {isCritical
                ? t('criticalRiskCommand')
                : hasDanger
                ? t('highRiskCommand')
                : t('permissionRequired')}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {prompt.tool ? `${t('toolName')}: ${prompt.tool}` : t('permissionRequiredDesc')}
            </span>
          </div>
        </div>

        <button
          onClick={onDeny}
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent transition-colors cursor-pointer"
          title={t('ignore')}
          aria-label={t('ignore')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Command Preview */}
      {command && (
        <div className="relative group">
          <div className="bg-background/95 dark:bg-zinc-950 border border-border/80 rounded-xl p-3 font-mono text-xs text-foreground overflow-x-auto selection:bg-primary/30">
            <span className="text-muted-foreground/60 mr-2 select-none">$</span>
            <span className="font-semibold">{command}</span>
          </div>
        </div>
      )}

      {/* Danger Badges & Explanations */}
      {hasDanger && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-background/60 border border-border/60">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t('riskWarningsTitle')}:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {dangerMatches.map((danger) => (
              <div
                key={danger.id}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-mono border ${
                  danger.severity === 'critical'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                }`}
                title={danger.description}
              >
                <span>⚠ {danger.label}</span>
                <span className="text-[10px] opacity-75 font-sans">({danger.description})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
        {/* 1. Allow Once */}
        <button
          onClick={onAllowOnce}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer text-xs"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{t('allowOnce')}</span>
        </button>

        {/* 2. Allow 10 Mins (Temporary Memory Whitelist) */}
        {command && (
          <button
            onClick={onAllowTemporary}
            className="px-3 py-1.5 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer text-xs"
            title={t('allow10MinDesc')}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('allow10Min')}</span>
          </button>
        )}

        {/* 3. Add to Permanent Whitelist */}
        {command && (
          <button
            onClick={onAddToWhitelist}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t('addToWhitelist')}</span>
          </button>
        )}

        {/* 4. Takeover in WebTTY */}
        <button
          onClick={onTakeoverTTY}
          className="px-2.5 py-1.5 border border-border bg-background rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>{t('takeoverTTY')}</span>
        </button>

        {/* 5. Deny / Ignore */}
        <button
          onClick={onDeny}
          className="ml-auto px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors cursor-pointer text-xs"
        >
          {t('deny')}
        </button>
      </div>
    </div>
  );
}
