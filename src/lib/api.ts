import type { ConversationSummary } from './types';

export interface ProjectsResponse {
  groups: Array<{ workspace: string; conversations: ConversationSummary[] }>;
  totalCount?: number;
  archivedCount?: number;
}

export interface HistoryResponse {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'tool';
    text?: string;
    thought?: string;
    name?: string;
    input?: any;
    output?: string;
    timestamp?: string;
  }>;
  totalTurns: number;
  loadedTurns: number;
  hasMore: boolean;
}

export async function fetchConversationHistory(
  conversationId: string,
  turns = 5,
  offset = 0
): Promise<HistoryResponse> {
  const res = await fetch(
    `/api/conversations/${encodeURIComponent(conversationId)}/history?turns=${turns}&offset=${offset}`
  );
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
  return res.json();
}

export async function fetchProjects(showArchived = false): Promise<ProjectsResponse> {
  const url = `/api/projects${showArchived ? '?showArchived=true' : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

export async function renameConversation(id: string, title: string): Promise<{ success: boolean; conversation_id: string; title: string }> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error(`Failed to rename conversation: ${res.status}`);
  return res.json();
}

export async function archiveConversation(id: string, archived = true): Promise<{ success: boolean; conversation_id: string; is_archived: boolean }> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived })
  });
  if (!res.ok) throw new Error(`Failed to archive conversation: ${res.status}`);
  return res.json();
}

export async function deleteConversation(id: string): Promise<{ success: boolean; conversation_id: string }> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`);
  return res.json();
}

export async function fetchPermissions(): Promise<{ allow: string[] }> {
  const res = await fetch('/api/settings/permissions');
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

export async function addPermission(pattern: string): Promise<void> {
  await fetch('/api/settings/permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern })
  });
}

export async function removePermission(pattern: string): Promise<void> {
  await fetch(`/api/settings/permissions/${encodeURIComponent(pattern)}`, {
    method: 'DELETE'
  });
}
