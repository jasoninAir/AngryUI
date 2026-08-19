import { useEffect, useState } from 'react';
import {
  X,
  Bot,
  Brain,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { fetchSubagentTranscript, type SubagentTranscriptStep } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

interface SubagentTranscriptDrawerProps {
  isOpen: boolean;
  conversationId: string | null;
  roleTitle?: string;
  onClose: () => void;
}

export function SubagentTranscriptDrawer({
  isOpen,
  conversationId,
  roleTitle,
  onClose
}: SubagentTranscriptDrawerProps) {
  const { t } = useLanguage();
  const [steps, setSteps] = useState<SubagentTranscriptStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!isOpen || !conversationId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    fetchSubagentTranscript(conversationId)
      .then((data) => {
        if (mounted) {
          setSteps(data.steps || []);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load subagent transcript');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, conversationId]);

  if (!isOpen || !conversationId) return null;

  const toggleThought = (idx: number) => {
    setExpandedThoughts((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250 select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate">
                {roleTitle || 'Subagent'} {t('transcript')}
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono truncate">
                ID: {conversationId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">{t('loadingTranscript')}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && steps.length === 0 && (
            <div className="py-16 text-center text-xs text-muted-foreground">
              {t('noTranscriptSteps')}
            </div>
          )}

          {!loading &&
            !error &&
            steps.map((st, idx) => (
              <div
                key={idx}
                className="border border-border/80 rounded-xl p-3.5 bg-card/60 shadow-2xs space-y-2.5"
              >
                {/* Step Header */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/40 pb-1.5">
                  <span className="font-mono font-medium text-foreground flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-muted text-[10px]">
                      #{st.stepIndex}
                    </span>
                    <span className="capitalize">{st.source}</span>
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    {st.status === 'DONE' ? (
                      <span className="text-emerald-500 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> DONE
                      </span>
                    ) : st.status === 'ERROR' ? (
                      <span className="text-rose-500 flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" /> ERROR
                      </span>
                    ) : (
                      <span className="text-blue-500 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {st.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Thinking Section */}
                {st.thinking && (
                  <div className="border border-border/60 rounded-lg overflow-hidden bg-muted/20">
                    <button
                      onClick={() => toggleThought(idx)}
                      className="w-full px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <Brain className="w-3.5 h-3.5 text-purple-500" />
                        <span>{t('subagentThought')}</span>
                      </span>
                      {expandedThoughts[idx] ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {expandedThoughts[idx] && (
                      <div className="p-2.5 pt-0 text-xs text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap border-t border-border/30 bg-muted/10">
                        {st.thinking}
                      </div>
                    )}
                  </div>
                )}

                {/* Tool Calls */}
                {st.toolCalls && st.toolCalls.length > 0 && (
                  <div className="space-y-1.5">
                    {st.toolCalls.map((tc, tIdx) => (
                      <div
                        key={tIdx}
                        className="border border-zinc-800 rounded-lg p-2.5 bg-zinc-950 dark:bg-zinc-900 text-zinc-200 text-xs font-mono"
                      >
                        <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                          <Wrench className="w-3.5 h-3.5" />
                          <span>{tc.name}</span>
                          {tc.toolAction && (
                            <span className="text-[10px] text-zinc-400 font-normal ml-auto">
                              {tc.toolAction}
                            </span>
                          )}
                        </div>
                        {tc.args && (
                          <pre className="overflow-x-auto text-[11px] text-zinc-400 max-h-40 leading-tight">
                            {typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Main Content */}
                {st.content && (
                  <div className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {st.content}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
