import { useEffect, useState, useCallback } from 'react';
import {
  fetchProjects,
  renameConversation,
  archiveConversation,
  deleteConversation,
  saveProjectAlias,
  clearWorkspaceProbes,
  type ProjectGroupItem
} from '@/lib/api';
import type { ConversationSummary } from '@/lib/types';

export type ProjectGroup = ProjectGroupItem;

export function useProjectIndex() {
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [archivedCount, setArchivedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const data = await fetchProjects(showArchived, force);
      setGroups(data.groups ?? []);
      setAliases(data.aliases ?? {});
      setArchivedCount(data.archivedCount ?? 0);
      setTotalCount(data.totalCount ?? 0);
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    refresh(false);

    const handleDiscovery = () => {
      refresh(false);
    };
    window.addEventListener('angryui:session_discovery', handleDiscovery);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        refresh(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const id = setInterval(() => {
      if (!document.hidden) {
        refresh(false);
      }
    }, 10000);

    return () => {
      window.removeEventListener('angryui:session_discovery', handleDiscovery);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(id);
    };
  }, [refresh]);

  const rename = async (conversationId: string, newTitle: string): Promise<boolean> => {
    try {
      await renameConversation(conversationId, newTitle);
      // Optimistic update
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          conversations: g.conversations.map((c) =>
            c.conversation_id === conversationId ? { ...c, title: newTitle } : c
          )
        }))
      );
      await refresh();
      return true;
    } catch (e) {
      console.error('Rename failed:', e);
      return false;
    }
  };

  const archive = async (conversationId: string, isArchived = true): Promise<boolean> => {
    try {
      await archiveConversation(conversationId, isArchived);
      // Optimistic update
      if (!showArchived && isArchived) {
        setGroups((prev) =>
          prev.map((g) => ({
            ...g,
            conversations: g.conversations.filter((c) => c.conversation_id !== conversationId)
          }))
        );
        setArchivedCount((c) => c + 1);
      } else {
        await refresh();
      }
      return true;
    } catch (e) {
      console.error('Archive failed:', e);
      return false;
    }
  };

  const remove = async (conversationId: string): Promise<boolean> => {
    try {
      await deleteConversation(conversationId);
      // Optimistic update
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          conversations: g.conversations.filter((c) => c.conversation_id !== conversationId),
          probes: g.probes?.filter((p) => p.conversation_id !== conversationId)
        }))
      );
      await refresh();
      return true;
    } catch (e) {
      console.error('Delete failed:', e);
      return false;
    }
  };

  const setAlias = async (workspace: string, alias: string): Promise<boolean> => {
    try {
      await saveProjectAlias(workspace, alias);
      const cleanW = workspace.startsWith('file://') ? workspace.replace('file://', '') : workspace;
      setAliases((prev) => ({ ...prev, [cleanW]: alias }));
      setGroups((prev) =>
        prev.map((g) => {
          const gClean = g.workspace.startsWith('file://') ? g.workspace.replace('file://', '') : g.workspace;
          if (gClean === cleanW || g.workspace === workspace) {
            return { ...g, alias };
          }
          return g;
        })
      );
      await refresh();
      return true;
    } catch (e) {
      console.error('Failed to save project alias:', e);
      return false;
    }
  };

  const clearProbes = async (workspace?: string): Promise<number> => {
    try {
      const res = await clearWorkspaceProbes(workspace);
      await refresh();
      return res.deletedCount || 0;
    } catch (e) {
      console.error('Failed to clear probes:', e);
      return 0;
    }
  };

  return {
    groups,
    aliases,
    archivedCount,
    totalCount,
    showArchived,
    setShowArchived,
    loading,
    refresh,
    rename,
    archive,
    remove,
    setAlias,
    clearProbes
  };
}
