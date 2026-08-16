import { useEffect, useState } from 'react';
import { fetchPermissions, addPermission, removePermission } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { ShieldCheck, Plus, Trash2 } from 'lucide-react';

const QUICK_PRESETS = [
  'command(npm install)',
  'command(npm run)',
  'command(git status)',
  'command(git diff)',
  'command(git log)',
  'command(ls)',
  'command(mkdir)',
  'command(cp)',
  'command(grep)',
  'command(python)',
  'command(curl)',
  'command(echo)'
];

export function PermissionsPanel() {
  const { t } = useLanguage();
  const [allow, setAllow] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await fetchPermissions();
      setAllow(data.allow);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (pattern: string) => {
    if (!pattern.startsWith('command(')) {
      setError('Pattern must start with command(');
      return;
    }
    try {
      await addPermission(pattern);
      setError('');
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAdd = async () => {
    if (!newPattern.trim()) return;
    await add(newPattern.trim());
    setNewPattern('');
  };

  const remove = async (pattern: string) => {
    await removePermission(pattern);
    await load();
  };

  // Filter presets to those not already in the allow list
  const availablePresets = QUICK_PRESETS.filter((p) => !allow.includes(p));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <span>{t('allowListTitle')}</span>
      </h2>
      <p className="text-xs text-muted-foreground">
        {t('allowListDesc')}
      </p>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <div className="flex gap-2">
        <input
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          placeholder={t('rulePlaceholder')}
          className="flex-1 border border-input rounded-md px-3 py-1.5 text-xs font-mono bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleAdd}
          disabled={!newPattern.trim()}
          className="rounded-md bg-primary text-primary-foreground px-4 text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('addRuleButton')}</span>
        </button>
      </div>
      {availablePresets.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-muted-foreground">{t('addNewRule')} (Quick presets):</div>
          <div className="flex flex-wrap gap-1.5">
            {availablePresets.map((p) => (
              <button
                key={p}
                onClick={() => add(p)}
                className="px-2 py-1 text-xs font-mono border border-border rounded bg-secondary text-secondary-foreground hover:bg-accent cursor-pointer transition-colors"
              >
                + {p}
              </button>
            ))}
          </div>
        </div>
      )}
      <ul className="space-y-1.5">
        {allow.length === 0 ? (
          <li className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">
            {t('noRulesYet')}
          </li>
        ) : (
          allow.map((p) => (
            <li
              key={p}
              className="flex items-center justify-between border border-border rounded-lg px-3 py-2 bg-card/40 text-xs"
            >
              <code className="font-mono text-foreground">{p}</code>
              <button
                onClick={() => remove(p)}
                className="text-xs text-destructive hover:bg-destructive/10 p-1 rounded transition-colors cursor-pointer flex items-center gap-1"
                title={t('removeRule')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('removeRule')}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
