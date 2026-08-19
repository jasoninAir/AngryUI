import type { ConversationSummary } from './types';
import { getStoredToken, clearStoredToken, broadcastTokenChange } from './auth';

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401 && !url.includes('/api/auth/') && !url.includes('/api/login')) {
    clearStoredToken();
    broadcastTokenChange(null);
  }
  return res;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  tokenRequired: boolean;
  authRequired: boolean;
}

export async function fetchAuthStatus(): Promise<AuthStatusResponse> {
  const res = await authFetch('/api/auth/status');
  if (!res.ok) {
    throw new Error(`Failed to fetch auth status: ${res.status}`);
  }
  return res.json();
}

export async function loginWithToken(token: string): Promise<{ ok: boolean; authenticated: boolean; token?: string; error?: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  if (res.status === 429) {
    return { ok: false, authenticated: false, error: 'Too many attempts. Please wait a minute.' };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, authenticated: false, error: data.error || 'Invalid token' };
  }
  return { ok: true, authenticated: true, token: data.token || token };
}

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
  const res = await authFetch(
    `/api/conversations/${encodeURIComponent(conversationId)}/history?turns=${turns}&offset=${offset}`
  );
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
  return res.json();
}

export async function fetchProjects(showArchived = false): Promise<ProjectsResponse> {
  const url = `/api/projects${showArchived ? '?showArchived=true' : ''}`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

export async function renameConversation(id: string, title: string): Promise<{ success: boolean; conversation_id: string; title: string }> {
  const res = await authFetch(`/api/conversations/${encodeURIComponent(id)}/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error(`Failed to rename conversation: ${res.status}`);
  return res.json();
}

export async function archiveConversation(id: string, archived = true): Promise<{ success: boolean; conversation_id: string; is_archived: boolean }> {
  const res = await authFetch(`/api/conversations/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived })
  });
  if (!res.ok) throw new Error(`Failed to archive conversation: ${res.status}`);
  return res.json();
}

export async function deleteConversation(id: string): Promise<{ success: boolean; conversation_id: string }> {
  const res = await authFetch(`/api/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`);
  return res.json();
}

export async function fetchPermissions(): Promise<{ allow: string[] }> {
  const res = await authFetch('/api/settings/permissions');
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

export async function addPermission(pattern: string): Promise<void> {
  await authFetch('/api/settings/permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern })
  });
}

export async function removePermission(pattern: string): Promise<void> {
  await authFetch(`/api/settings/permissions/${encodeURIComponent(pattern)}`, {
    method: 'DELETE'
  });
}
