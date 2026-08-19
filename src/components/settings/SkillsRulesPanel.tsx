import { useEffect, useState, useMemo } from 'react';
import {
  Sparkles,
  Zap,
  BookOpen,
  Search,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  FolderTree,
  ExternalLink,
  Loader2
} from 'lucide-react';
import {
  fetchSkillsAndRules,
  toggleSkill,
  reloadSkills,
  type SkillItem,
  type RuleItem
} from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export function SkillsRulesPanel() {
  const { t } = useLanguage();
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'builtin' | 'plugin' | 'custom' | 'rules'>('all');
  const [togglingSkill, setTogglingSkill] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchSkillsAndRules();
      setSkills(data.skills || []);
      setRules(data.rules || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (skill: SkillItem) => {
    setTogglingSkill(skill.name);
    try {
      const next = !skill.enabled;
      await toggleSkill(skill.name, next);
      setSkills((prev) =>
        prev.map((s) => (s.name === skill.name ? { ...s, enabled: next } : s))
      );
    } catch {} finally {
      setTogglingSkill(null);
    }
  };

  const handleReload = async () => {
    setReloading(true);
    try {
      const data = await reloadSkills();
      setSkills(data.skills || []);
      setRules(data.rules || []);
    } catch {} finally {
      setReloading(false);
    }
  };

  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      if (selectedTab === 'builtin' && s.category !== 'builtin') return false;
      if (selectedTab === 'plugin' && s.category !== 'plugin') return false;
      if (selectedTab === 'custom' && s.category !== 'custom') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.triggers?.some((tr) => tr.toLowerCase().includes(q))
      );
    });
  }, [skills, selectedTab, searchQuery]);

  const filteredRules = useMemo(() => {
    if (!searchQuery.trim()) return rules;
    const q = searchQuery.toLowerCase();
    return rules.filter(
      (r) => r.name.toLowerCase().includes(q) || r.content.toLowerCase().includes(q)
    );
  }, [rules, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Title & Reload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{t('skillsAndRulesTitle')}</span>
          </h2>
          <p className="text-xs text-muted-foreground">{t('skillsAndRulesDesc')}</p>
        </div>

        <button
          onClick={handleReload}
          disabled={reloading || loading}
          className="px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-accent border border-border rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reloading ? 'animate-spin text-primary' : ''}`} />
          <span>{t('hotReloadSkills')}</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/80 overflow-x-auto text-xs">
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
              selectedTab === 'all'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('allSkills')} ({skills.length})
          </button>
          <button
            onClick={() => setSelectedTab('plugin')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
              selectedTab === 'plugin'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('plugins')}
          </button>
          <button
            onClick={() => setSelectedTab('custom')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
              selectedTab === 'custom'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('customSkills')}
          </button>
          <button
            onClick={() => setSelectedTab('builtin')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
              selectedTab === 'builtin'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('builtin')}
          </button>
          <button
            onClick={() => setSelectedTab('rules')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
              selectedTab === 'rules'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('systemRules')} ({rules.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchSkills')}
            className="w-full bg-card/60 border border-border rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs">{t('loadingSkills')}</span>
        </div>
      ) : selectedTab === 'rules' ? (
        /* Rules List */
        <div className="space-y-3">
          {filteredRules.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {t('noRulesFound')}
            </div>
          ) : (
            filteredRules.map((rule) => (
              <div
                key={rule.id}
                className="border border-border rounded-xl p-3.5 bg-card/50 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground font-mono">
                      {rule.name}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {rule.scope}
                  </span>
                </div>
                <pre className="text-[11px] font-mono p-2.5 rounded-lg bg-muted/30 border border-border/50 overflow-x-auto text-muted-foreground max-h-48 leading-relaxed">
                  {rule.content}
                </pre>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Skills Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSkills.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
              {t('noSkillsFound')}
            </div>
          ) : (
            filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className={`border rounded-xl p-3.5 bg-card/60 shadow-2xs flex flex-col justify-between space-y-2.5 transition-all ${
                  skill.enabled ? 'border-border' : 'border-border/40 opacity-60 bg-muted/10'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-foreground truncate font-mono">
                        {skill.name}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full ${
                          skill.category === 'builtin'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                            : skill.category === 'plugin'
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {skill.sourcePlugin || skill.category}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(skill)}
                    disabled={togglingSkill === skill.name}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      skill.enabled ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform ${
                        skill.enabled ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {skill.description}
                </p>

                {/* Trigger keywords / badges */}
                {skill.triggers && skill.triggers.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                    {skill.triggers.map((tr, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-secondary/80 text-secondary-foreground px-1.5 py-0.2 rounded-md font-mono"
                      >
                        #{tr}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
