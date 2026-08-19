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

// Phase 3 — Subagents API
export interface SubagentInfo {
  conversationId: string;
  typeName: string;
  role: string;
  model: string;
  prompt: string;
  workspace?: string;
  state: 'running' | 'idle' | 'waiting' | 'errored' | 'done';
  stateDetail?: string;
  stepCount: number;
  createdAt: string;
  durationMs: number;
  transcriptUri: string;
  lastMessage?: string;
}

export async function fetchConversationSubagents(
  conversationId: string
): Promise<{ parentId: string; subagents: SubagentInfo[] }> {
  const res = await authFetch(`/api/conversations/${encodeURIComponent(conversationId)}/subagents`);
  if (!res.ok) throw new Error(`Failed to fetch subagents: ${res.status}`);
  return res.json();
}

export interface SubagentTranscriptStep {
  stepIndex: number;
  source: string;
  type: string;
  status: string;
  createdAt?: string;
  content?: string;
  thinking?: string;
  toolCalls?: Array<{
    name: string;
    args: any;
    toolAction?: string;
    toolSummary?: string;
  }>;
}

export async function fetchSubagentTranscript(
  subId: string
): Promise<{ conversationId: string; steps: SubagentTranscriptStep[]; totalSteps: number }> {
  const res = await authFetch(`/api/subagents/${encodeURIComponent(subId)}/transcript`);
  if (!res.ok) throw new Error(`Failed to fetch transcript: ${res.status}`);
  return res.json();
}

// Phase 3 — Artifacts API
export interface ArtifactSummary {
  filename: string;
  title: string;
  summary?: string;
  path: string;
  size: number;
  mtime: string;
  slideCount: number;
  hasMermaid: boolean;
  hasDiff: boolean;
}

export interface ArtifactDetail extends ArtifactSummary {
  content: string;
  slides: string[];
}

export async function fetchConversationArtifacts(
  conversationId: string
): Promise<{ conversationId: string; artifacts: ArtifactSummary[]; totalCount: number }> {
  const res = await authFetch(`/api/conversations/${encodeURIComponent(conversationId)}/artifacts`);
  if (!res.ok) throw new Error(`Failed to fetch artifacts: ${res.status}`);
  return res.json();
}

export async function fetchArtifactDetail(
  conversationId: string,
  filename: string
): Promise<ArtifactDetail> {
  const res = await authFetch(
    `/api/conversations/${encodeURIComponent(conversationId)}/artifacts/${encodeURIComponent(filename)}`
  );
  if (!res.ok) throw new Error(`Failed to fetch artifact detail: ${res.status}`);
  return res.json();
}

// Phase 3 — Skills & Rules API
export interface SkillItem {
  id: string;
  name: string;
  description: string;
  category: 'builtin' | 'plugin' | 'custom';
  sourcePlugin?: string;
  path: string;
  enabled: boolean;
  triggers?: string[];
  systemPromptSnippet?: string;
}

export interface RuleItem {
  id: string;
  name: string;
  scope: 'global' | 'project' | 'user';
  description?: string;
  content: string;
  path?: string;
  enabled: boolean;
}

export async function fetchSkillsAndRules(): Promise<{ skills: SkillItem[]; rules: RuleItem[] }> {
  const res = await authFetch('/api/skills');
  if (!res.ok) throw new Error(`Failed to fetch skills: ${res.status}`);
  return res.json();
}

export async function toggleSkill(name: string, enabled?: boolean): Promise<{ success: boolean; name: string; enabled: boolean }> {
  const res = await authFetch(`/api/skills/${encodeURIComponent(name)}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
  if (!res.ok) throw new Error(`Failed to toggle skill: ${res.status}`);
  return res.json();
}

export async function reloadSkills(): Promise<{ success: boolean; skills: SkillItem[]; rules: RuleItem[] }> {
  const res = await authFetch('/api/skills/reload', { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to reload skills: ${res.status}`);
  return res.json();
}

// Phase 3 — MCP Inspector API
export interface McpToolInfo {
  name: string;
  description?: string;
  parameters?: any;
  required?: string[];
}

export interface McpServerInfo {
  name: string;
  command?: string;
  args?: string[];
  mode: 'eager' | 'lazy';
  tools: McpToolInfo[];
  instructions?: string;
  status: 'active' | 'idle' | 'error';
  pingMs?: number;
}

export async function fetchMcpServers(): Promise<{ servers: McpServerInfo[]; totalCount: number }> {
  const res = await authFetch('/api/mcp/servers');
  if (!res.ok) throw new Error(`Failed to fetch MCP servers: ${res.status}`);
  return res.json();
}

export async function pingMcpServer(serverName: string): Promise<{ success: boolean; pingMs: number; error?: string }> {
  const res = await authFetch(`/api/mcp/ping/${encodeURIComponent(serverName)}`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to ping MCP server: ${res.status}`);
  return res.json();
}
