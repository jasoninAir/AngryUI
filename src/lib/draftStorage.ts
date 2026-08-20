/**
 * Local draft persistence utility for ChatInput (X-5 / P4-14).
 * Safely handles browser localStorage and in-memory fallback.
 */

const memoryDrafts = new Map<string, string>();

export function getDraftKey(conversationId?: string): string {
  return `angryui_draft_${conversationId || 'default'}`;
}

export function getDraft(conversationId?: string): string {
  const key = getDraftKey(conversationId);
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) || '';
    }
  } catch {}
  return memoryDrafts.get(key) || '';
}

export function setDraft(conversationId: string | undefined, text: string): void {
  const key = getDraftKey(conversationId);
  const trimmed = text.trim();
  try {
    if (typeof localStorage !== 'undefined') {
      if (trimmed) {
        localStorage.setItem(key, text);
      } else {
        localStorage.removeItem(key);
      }
    }
  } catch {}

  if (trimmed) {
    memoryDrafts.set(key, text);
  } else {
    memoryDrafts.delete(key);
  }
}

export function clearDraft(conversationId?: string): void {
  const key = getDraftKey(conversationId);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {}
  memoryDrafts.delete(key);
}
