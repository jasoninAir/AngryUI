// src/lib/auth.ts
const TOKEN_KEY = 'angryui_auth_token';

export function getStoredToken(): string | null {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setStoredToken(token: string): void {
  try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* blocked */ }
}
export function clearStoredToken(): void { sessionStorage.removeItem(TOKEN_KEY); }

// Broadcast token changes across tabs
const _ch = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('angryui_auth') : null;
export function broadcastTokenChange(token: string | null): void { _ch?.postMessage({ type: 'token_change', token }); }
