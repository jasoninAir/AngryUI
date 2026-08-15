import { useEffect, useState, useCallback } from 'react';
import { fetchProjects } from '@/lib/api';
import type { ConversationSummary } from '@/lib/types';

export type ProjectGroup = { workspace: string; conversations: ConversationSummary[] };

export function useProjectIndex() {
  const [groups, setGroups] = useState<ProjectGroup[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchProjects();
      setGroups(data.groups);
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  return { groups, refresh };
}
