import { useEffect, useState } from 'react';
import { fetchPermissions, addPermission, removePermission } from '@/lib/api';

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
      <h2 className="text-xl font-semibold">Permissions Allow List</h2>
      <p className="text-sm text-muted-foreground">
        AGY uses these patterns to auto-approve tool calls. Patterns must start with{' '}
        <code>command(</code>.
      </p>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <div className="flex gap-2">
        <input
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          placeholder="command(npm install)"
          className="flex-1 border border-input rounded px-3 py-1.5 text-sm font-mono"
        />
        <button
          onClick={handleAdd}
          className="rounded bg-primary text-primary-foreground px-4 text-sm"
        >
          Add
        </button>
      </div>
      {availablePresets.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-2">Quick presets:</div>
          <div className="flex flex-wrap gap-2">
            {availablePresets.map((p) => (
              <button
                key={p}
                onClick={() => add(p)}
                className="px-2 py-1 text-xs font-mono border border-border rounded bg-secondary text-secondary-foreground hover:bg-accent"
              >
                + {p}
              </button>
            ))}
          </div>
        </div>
      )}
      <ul className="space-y-1">
        {allow.map((p) => (
          <li
            key={p}
            className="flex items-center justify-between border border-border rounded px-3 py-1.5"
          >
            <code className="text-sm">{p}</code>
            <button onClick={() => remove(p)} className="text-xs text-destructive">
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
