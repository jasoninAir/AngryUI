// src/lib/pinnedWorkspaces.ts
import { useState, useEffect, useCallback } from 'react';

const PINNED_STORAGE_KEY = 'angryui_pinned_workspaces';

function normalizeWorkspace(ws: string): string {
  if (!ws) return '';
  let clean = ws.trim();
  if (clean.startsWith('file://')) {
    clean = clean.replace('file://', '');
  }
  return clean.replace(/\/+$/, '');
}

export function getPinnedWorkspaces(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      return list.map(normalizeWorkspace).filter(Boolean);
    }
  } catch {}
  return [];
}

export function setPinnedWorkspaces(workspaces: string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const cleanList = Array.from(new Set(workspaces.map(normalizeWorkspace).filter(Boolean)));
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(cleanList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('angryui_pinned_workspaces_change', { detail: cleanList }));
    }
  } catch {}
}

export function isWorkspacePinned(workspace: string): boolean {
  const norm = normalizeWorkspace(workspace);
  if (!norm) return false;
  const pinned = getPinnedWorkspaces();
  return pinned.includes(norm);
}

export function pinWorkspace(workspace: string): void {
  const norm = normalizeWorkspace(workspace);
  if (!norm) return;
  const pinned = getPinnedWorkspaces();
  if (!pinned.includes(norm)) {
    setPinnedWorkspaces([...pinned, norm]);
  }
}

export function unpinWorkspace(workspace: string): void {
  const norm = normalizeWorkspace(workspace);
  if (!norm) return;
  const pinned = getPinnedWorkspaces();
  setPinnedWorkspaces(pinned.filter((w) => w !== norm));
}

export function togglePinWorkspace(workspace: string): boolean {
  const norm = normalizeWorkspace(workspace);
  if (!norm) return false;
  const pinned = getPinnedWorkspaces();
  const exists = pinned.includes(norm);
  if (exists) {
    unpinWorkspace(norm);
    return false;
  } else {
    pinWorkspace(norm);
    return true;
  }
}

/**
 * React hook for live subscribed pinned workspaces state
 */
export function usePinnedWorkspaces(): {
  pinnedWorkspaces: string[];
  isPinned: (ws: string) => boolean;
  togglePin: (ws: string) => boolean;
  pin: (ws: string) => void;
  unpin: (ws: string) => void;
} {
  const [pinnedWorkspaces, setPinned] = useState<string[]>(() => getPinnedWorkspaces());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      setPinned(getPinnedWorkspaces());
    };
    window.addEventListener('angryui_pinned_workspaces_change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('angryui_pinned_workspaces_change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const isPinned = useCallback(
    (ws: string) => isWorkspacePinned(ws),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pinnedWorkspaces]
  );

  const togglePin = useCallback(
    (ws: string) => togglePinWorkspace(ws),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pinnedWorkspaces]
  );

  const pin = useCallback(
    (ws: string) => pinWorkspace(ws),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pinnedWorkspaces]
  );

  const unpin = useCallback(
    (ws: string) => unpinWorkspace(ws),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pinnedWorkspaces]
  );

  return { pinnedWorkspaces, isPinned, togglePin, pin, unpin };
}
