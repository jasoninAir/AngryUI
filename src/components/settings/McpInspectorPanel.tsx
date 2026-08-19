import { useEffect, useState } from 'react';
import {
  Server,
  Zap,
  Wrench,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  Loader2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { fetchMcpServers, pingMcpServer, type McpServerInfo } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export function McpInspectorPanel() {
  const { t } = useLanguage();
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [pinging, setPinging] = useState<Record<string, boolean>>({});
  const [pingResults, setPingResults] = useState<Record<string, { ok: boolean; pingMs: number; error?: string }>>({});
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const loadServers = async () => {
    setLoading(true);
    try {
      const data = await fetchMcpServers();
      setServers(data.servers || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const handlePing = async (serverName: string) => {
    setPinging((prev) => ({ ...prev, [serverName]: true }));
    try {
      const res = await pingMcpServer(serverName);
      setPingResults((prev) => ({
        ...prev,
        [serverName]: { ok: res.success, pingMs: res.pingMs, error: res.error }
      }));
    } catch (err: any) {
      setPingResults((prev) => ({
        ...prev,
        [serverName]: { ok: false, pingMs: 0, error: err.message || 'Ping failed' }
      }));
    } finally {
      setPinging((prev) => ({ ...prev, [serverName]: false }));
    }
  };

  const toggleTools = (name: string) => {
    setExpandedTools((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <span>{t('mcpInspectorTitle')}</span>
          </h2>
          <p className="text-xs text-muted-foreground">{t('mcpInspectorDesc')}</p>
        </div>

        <button
          onClick={loadServers}
          disabled={loading}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          title="Refresh servers"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {/* Server List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs">{t('loadingMcpServers')}</span>
        </div>
      ) : servers.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl p-6">
          <Server className="w-8 h-8 opacity-40 mx-auto mb-2" />
          <p className="font-medium text-foreground/80">{t('noMcpServersConfigured')}</p>
          <p className="text-[11px] mt-1">{t('noMcpServersHint')}</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {servers.map((srv) => {
            const isToolsExpanded = expandedTools[srv.name] ?? false;
            const pingInfo = pingResults[srv.name];

            return (
              <div
                key={srv.name}
                className="border border-border rounded-xl p-4 bg-card/60 shadow-2xs space-y-3"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground font-mono">{srv.name}</h3>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.2 rounded-full bg-secondary text-secondary-foreground font-medium">
                          {srv.mode}
                        </span>
                      </div>
                      {srv.command && (
                        <p className="text-[11px] font-mono text-muted-foreground truncate max-w-md mt-0.5">
                          {srv.command} {srv.args?.join(' ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ping and Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {pingInfo && (
                      <span
                        className={`text-xs font-mono flex items-center gap-1 ${
                          pingInfo.ok ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {pingInfo.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{pingInfo.ok ? `${pingInfo.pingMs}ms` : pingInfo.error || 'Error'}</span>
                      </span>
                    )}

                    <button
                      onClick={() => handlePing(srv.name)}
                      disabled={pinging[srv.name]}
                      className="px-2.5 py-1 bg-secondary text-secondary-foreground hover:bg-accent border border-border rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Activity className={`w-3 h-3 ${pinging[srv.name] ? 'animate-spin text-primary' : ''}`} />
                      <span>{t('testPing')}</span>
                    </button>
                  </div>
                </div>

                {/* Tools Accordion */}
                <div className="border border-border/60 rounded-lg overflow-hidden bg-muted/20">
                  <button
                    onClick={() => toggleTools(srv.name)}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-primary" />
                      <span>
                        {t('availableTools')} ({srv.tools.length})
                      </span>
                    </span>
                    {isToolsExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {isToolsExpanded && (
                    <div className="p-3 pt-1 space-y-2 border-t border-border/30 bg-card/40">
                      {srv.tools.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">
                          {t('noToolsDefinedInSchema')}
                        </p>
                      ) : (
                        srv.tools.map((tool) => (
                          <div
                            key={tool.name}
                            className="border border-border/50 rounded-lg p-2.5 bg-card/80 text-xs font-mono space-y-1"
                          >
                            <div className="flex items-center justify-between font-semibold text-primary">
                              <span>{tool.name}</span>
                            </div>
                            {tool.description && (
                              <p className="text-muted-foreground text-[11px] font-sans">
                                {tool.description}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
