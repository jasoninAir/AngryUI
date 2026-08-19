// src/lib/auth.ts
const TOKEN_KEY = 'angryui_auth_token';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function getStoredToken(): string | null {
  try {
    const local = localStorage.getItem(TOKEN_KEY);
    if (local) return local;
  } catch {}

  try {
    const session = sessionStorage.getItem(TOKEN_KEY);
    if (session) return session;
  } catch {}

  try {
    const cookie = getCookie(TOKEN_KEY);
    if (cookie) {
      // Re-hydrate localStorage if lost
      try { localStorage.setItem(TOKEN_KEY, cookie); } catch {}
      return cookie;
    }
  } catch {}

  return null;
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {}
  try {
    setCookie(TOKEN_KEY, token);
  } catch {}
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
  try {
    deleteCookie(TOKEN_KEY);
  } catch {}
}

// Broadcast token changes across tabs
const _ch = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('angryui_auth') : null;
export function broadcastTokenChange(token: string | null): void {
  _ch?.postMessage({ type: 'token_change', token });
}
