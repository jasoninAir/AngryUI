import { useEffect, useState } from 'react';
import {
  X,
  Network,
  Bot,
  Brain,
  Cpu,
  Clock,
  Sparkles,
  ArrowDownRight,
  FileText,
  RefreshCw,
  Search,
  Code,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Play
} from 'lucide-react';
import { fetchConversationSubagents, type SubagentInfo } from '@/lib/api';
import { SubagentTranscriptDrawer } from './SubagentTranscriptDrawer';
import { useLanguage } from '@/context/LanguageContext';

interface SubagentTopologyModalProps {
  isOpen: boolean;
  conversationId: string;
  onClose: () => void;
}

export function SubagentTopologyModal({
  isOpen,
  conversationId,
  onClose
}: SubagentTopologyModalProps) {
  const { t } = useLanguage();
  const [subagents, setSubagents] = useState<SubagentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTranscriptId, setActiveTranscriptId] = useState<string | null>(null);
  const [activeRoleTitle, setActiveRoleTitle] = useState<string>('');

  const loadSubagents = async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const res = await fetchConversationSubagents(conversationId);
      setSubagents(res.subagents || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSubagents();
      const interval = setInterval(loadSubagents, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, conversationId]);

  if (!isOpen) return null;

  const getRoleIcon = (roleName: string, typeName: string) => {
    const text = `${roleName} ${typeName}`.toLowerCase();
    if (text.includes('research') || text.includes('search')) return <Search className="w-4 h-4 text-blue-500" />;
    if (text.includes('review') || text.includes('code')) return <Code className="w-4 h-4 text-emerald-500" />;
    if (text.includes('security') || text.includes('audit')) return <ShieldCheck className="w-4 h-4 text-purple-500" />;
    if (text.includes('perf') || text.includes('speed')) return <Zap className="w-4 h-4 text-amber-500" />;
    return <Bot className="w-4 h-4 text-primary" />;
  };

  const formatDuration = (ms: number) => {
    if (!ms) return '0s';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <span>{t('subagentTopologyTitle')}</span>
                <span className="text-xs font-mono font-normal bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground">
                  {subagents.length} {t('activeSubagents')}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">{t('subagentTopologyDesc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSubagents}
              disabled={loading}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              title="Refresh topology"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Topology Graph Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Root / Parent Orchestrator Node */}
          <div className="flex flex-col items-center">
            <div className="border-2 border-primary bg-primary/10 rounded-2xl p-3.5 shadow-lg max-w-md w-full text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Orchestrator
              </div>
              <div className="flex items-center justify-center gap-2 font-semibold text-sm text-foreground pt-1">
                <Brain className="w-4 h-4 text-primary" />
                <span>Antigravity Main Agent</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                Session ID: {conversationId}
              </p>
            </div>

            {/* Tree Branch Connector */}
            {subagents.length > 0 && (
              <div className="w-0.5 h-8 bg-border my-1 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
              </div>
            )}
          </div>

          {/* Subagents Grid / Topology Nodes */}
          {subagents.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl p-6 bg-muted/10">
              <Bot className="w-8 h-8 opacity-40 mx-auto mb-2" />
              <p className="font-medium text-foreground/80">{t('noSubagentsSpawned')}</p>
              <p className="text-[11px] mt-1 max-w-md mx-auto">
                {t('noSubagentsHint')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subagents.map((sub) => (
                <div
                  key={sub.conversationId}
                  className="border border-border rounded-xl p-4 bg-card/80 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-3 relative group"
                >
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-2 rounded-lg bg-secondary border border-border/80 shrink-0">
                        {getRoleIcon(sub.role, sub.typeName)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground truncate" title={sub.role}>
                          {sub.role}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                          <span className="capitalize">{sub.typeName}</span>
                          <span>•</span>
                          <span className="uppercase text-[10px] bg-muted px-1.5 py-0.2 rounded font-sans">
                            {sub.model}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {sub.state === 'running' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          RUNNING
                        </span>
                      ) : sub.state === 'done' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          DONE
                        </span>
                      ) : sub.state === 'errored' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          ERROR
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                          {sub.state.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Prompt / Last Action Preview */}
                  <div className="text-xs text-muted-foreground bg-muted/20 border border-border/50 rounded-lg p-2.5 font-mono line-clamp-2 leading-relaxed">
                    {sub.lastMessage || sub.prompt || 'Executing subagent instructions...'}
                  </div>

                  {/* Metrics Footer & Transcript Inspection Button */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span>{formatDuration(sub.durationMs)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-muted-foreground" />
                        <span>{sub.stepCount} {t('steps')}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTranscriptId(sub.conversationId);
                        setActiveRoleTitle(sub.role);
                      }}
                      className="px-2.5 py-1 bg-secondary text-secondary-foreground hover:bg-accent border border-border rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3 h-3 text-primary" />
                      <span>{t('viewTranscript')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Subagent Transcript Drawer */}
      <SubagentTranscriptDrawer
        isOpen={Boolean(activeTranscriptId)}
        conversationId={activeTranscriptId}
        roleTitle={activeRoleTitle}
        onClose={() => setActiveTranscriptId(null)}
      />
    </div>
  );
}
