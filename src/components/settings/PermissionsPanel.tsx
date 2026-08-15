import { useEffect, useState } from 'react';
import { fetchPermissions, addPermission, removePermission } from '@/lib/api';

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

  const add = async () => {
    if (!newPattern.startsWith('command(')) {
      setError('Pattern must start with command(');
      return;
    }
    try {
      await addPermission(newPattern);
      setNewPattern('');
      setError('');
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const remove = async (pattern: string) => {
    await removePermission(pattern);
    await load();
  };

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
          onClick={add}
          className="rounded bg-primary text-primary-foreground px-4 text-sm"
        >
          Add
        </button>
      </div>
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
