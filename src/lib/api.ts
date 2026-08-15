import type { ConversationSummary } from './types';

export async function fetchProjects(): Promise<{
  groups: Array<{ workspace: string; conversations: ConversationSummary[] }>;
}> {
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}
