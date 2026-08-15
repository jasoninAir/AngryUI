import type { ConversationSummary } from './types';

export async function fetchProjects(): Promise<{
  groups: Array<{ workspace: string; conversations: ConversationSummary[] }>;
}> {
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
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
