import { useEffect, useState, useCallback } from 'react';
import {
  fetchProjects,
  renameConversation,
  archiveConversation,
  deleteConversation
} from '@/lib/api';
import type { ConversationSummary } from '@/lib/types';

export type ProjectGroup = { workspace: string; conversations: ConversationSummary[] };

export function useProjectIndex() {
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedCount, setArchivedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchProjects(showArchived);
      setGroups(data.groups ?? []);
      setArchivedCount(data.archivedCount ?? 0);
      setTotalCount(data.totalCount ?? 0);
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    }
  }, [showArchived]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
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
          conversations: g.conversations.filter((c) => c.conversation_id !== conversationId)
        }))
      );
      await refresh();
      return true;
    } catch (e) {
      console.error('Delete failed:', e);
      return false;
    }
  };

  return {
    groups,
    archivedCount,
    totalCount,
    showArchived,
    setShowArchived,
    loading,
    refresh,
    rename,
    archive,
    remove
  };
}
