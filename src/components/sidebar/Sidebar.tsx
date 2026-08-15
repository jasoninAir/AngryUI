import { useProjectIndex } from '@/hooks/useProjectIndex';
import { WorkspaceGroup } from './WorkspaceGroup';

export function Sidebar() {
  const { groups, refresh } = useProjectIndex();

  return (
    <aside className="w-64 h-screen border-r border-border p-3 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Projects</h2>
        <button onClick={refresh} className="text-xs text-muted-foreground hover:text-foreground">
          ↻
        </button>
      </div>
      {groups.length === 0 && <p className="text-sm text-muted-foreground">No conversations yet.</p>}
      {groups.map((g) => (
        <WorkspaceGroup key={g.workspace} workspace={g.workspace} conversations={g.conversations} />
      ))}
    </aside>
  );
}
