import { useState } from 'react';
import { SecurityPanel } from './SecurityPanel';
import { SoundPanel } from './SoundPanel';
import { PwaInstallPanel } from './PwaInstallPanel';
import { SkillsRulesPanel } from './SkillsRulesPanel';
import { McpInspectorPanel } from './McpInspectorPanel';
import { useLanguage } from '@/context/LanguageContext';
import { KeyRound, Sparkles, Server, Volume2, Download } from 'lucide-react';

export function SettingsPanel() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'security' | 'skills' | 'mcp' | 'notifications' | 'pwa'>('skills');

  return (
    <div className="flex flex-col h-full">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-border bg-muted/20 overflow-x-auto shrink-0 text-xs">
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'skills'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('skillsAndRulesTitle')}</span>
        </button>

        <button
          onClick={() => setActiveTab('mcp')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'mcp'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>{t('mcpInspectorTitle')}</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'security'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>{t('securityTitle')}</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'notifications'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>{t('soundTitle')}</span>
        </button>

        <button
          onClick={() => setActiveTab('pwa')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'pwa'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t('pwaTitle')}</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-4 sm:p-5 overflow-y-auto flex-1">
        {activeTab === 'skills' && <SkillsRulesPanel />}
        {activeTab === 'mcp' && <McpInspectorPanel />}
        {activeTab === 'security' && <SecurityPanel />}
        {activeTab === 'notifications' && <SoundPanel />}
        {activeTab === 'pwa' && <PwaInstallPanel />}
      </div>
    </div>
  );
}
