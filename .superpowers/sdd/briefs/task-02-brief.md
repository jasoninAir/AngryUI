# Task 0.2: Client sends Bearer token + login screen when unauthenticated

## Context
This is Task 2 of the AngryUI audit fix plan. It fixes CRITICAL issue A-02:
the server accepts Bearer token but the client never sends it.
Project: /Users/jason/myprojects/angryui (React 19 + TypeScript + Express + node-pty).
Current HEAD after Task 0.1: 0efbf21b2a285e2dc5a3c73291e60c5d84d8121c

## Problem
`server/utils/tokens.ts` has Bearer token validation middleware, but:
1. The client (`src/`) never stores or sends any token
2. Even with `--token` configured, anyone can access the API anonymously
3. No login screen when token is required

## Goal
- Client stores token in sessionStorage
- All API fetch calls inject `Authorization: Bearer <token>`
- WS connects with `?token=<token>` query param (server already checks this in `tokens.ts:10`)
- When no token is stored, show a minimal LoginScreen
- Token syncs across browser tabs via BroadcastChannel

## Files to Create or Modify

### 1. `src/lib/auth.ts` — CREATE
```typescript
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
```

### 2. `src/context/AuthContext.tsx` — CREATE
```tsx
// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getStoredToken, setStoredToken, clearStoredToken, broadcastTokenChange } from '@/lib/auth';

interface AuthContextValue { token: string | null; isAuthenticated: boolean; login: (t: string) => void; logout: () => void; }
export const AuthContext = createContext<AuthContextValue>({ token: null, isAuthenticated: false, login: () => {}, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken);
  useEffect(() => {
    const ch = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('angryui_auth') : null;
    const h = (e: MessageEvent) => { if (e.data?.type === 'token_change') setToken(e.data.token); };
    ch?.addEventListener('message', h);
    return () => ch?.removeEventListener('message', h);
  }, []);
  const login = (t: string) => { setStoredToken(t); broadcastTokenChange(t); setToken(t); };
  const logout = () => { clearStoredToken(); broadcastTokenChange(null); setToken(null); };
  return <AuthContext.Provider value={{ token, isAuthenticated: token !== null, login, logout }}>{children}</AuthContext.Provider>;
}
```

### 3. `src/lib/api.ts` — MODIFY
Add `authFetch()` wrapper, replace ALL `fetch()` calls with `authFetch()`.
The `/api/upload` call in `ChatInput.tsx` also needs this — for simplicity, also inline the token inject there.

```typescript
// At top of src/lib/api.ts, add:
import { getStoredToken } from './auth';

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

// Then replace all fetch(url) with authFetch(url) and
// fetch(url, init) with authFetch(url, init)
```

### 4. `src/hooks/useWebSocket.ts` — MODIFY
Around line 15, change:
```typescript
// BEFORE:
const ws = new WebSocket(url);

// AFTER:
const token = getStoredToken();
const wsUrl = token
  ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
  : url;
const ws = new WebSocket(wsUrl);
```
Add import: `import { getStoredToken } from '@/lib/auth';` at the top.

### 5. `src/App.tsx` — MODIFY
Wrap the app with AuthProvider. Add a minimal LoginScreen shown when `!isAuthenticated`.

```tsx
// Add near top:
import { AuthProvider, useAuth } from '@/context/AuthContext';

// Minimal login screen component inside App.tsx or as separate inline:
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex h-screen items-center justify-center">
      <form onSubmit={e => { e.preventDefault(); onLogin(val); }} className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">AngryUI</h1>
        <input type="password" value={val} onChange={e => setVal(e.target.value)}
          placeholder="Enter access token" className="border rounded px-3 py-2" autoFocus />
        <button type="submit" className="bg-primary text-primary-foreground rounded px-4 py-2">
          Connect
        </button>
      </form>
    </div>
  );
}

// Wrap return with AuthProvider at root level; show LoginScreen when !isAuthenticated
// e.g.: return <AuthProvider><Inner /></AuthProvider>;
// where Inner reads useAuth() and conditionally renders LoginScreen or the real app
```

### 6. `server/utils/tokens.ts` — MODIFY line ~23
```typescript
// BEFORE:
res.status(401).json({ error: 'Unauthorized' });

// AFTER:
res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED', requestId: (req as any).requestId });
```
Note: This requires `req.requestId` to exist. If `index.ts` has a requestId middleware that sets it, use that. If not yet, just use a generated ID or omit `requestId` here for now (Phase 1 Task 1.4 adds the middleware).

### 7. `src/components/chat/ChatInput.tsx` — MODIFY the `/api/upload` fetch
Around line 222, update the fetch call:
```typescript
import { getStoredToken } from '@/lib/auth';
// Inside handleSubmit, before the fetch:
const token = getStoredToken();
const hdrs = { 'Content-Type': 'application/json' };
if (token) hdrs['Authorization'] = `Bearer ${token}`;
const res = await fetch('/api/upload', { method: 'POST', headers: hdrs, body: ... });
```

## Test Strategy
- Manual test: run `npm run dev`, verify:
  1. No token → login screen appears
  2. Enter correct token → main UI loads
  3. All API calls in Network tab carry `Authorization: Bearer <token>` header
  4. Open two tabs, login on one → other tab syncs (BroadcastChannel)
  5. WS connects with `?token=` in URL

## Success Criteria
1. `npm test -- --run` → ALL tests pass (existing tests must not regress)
2. New auth files compile without TypeScript errors
3. Login flow works manually
4. `git commit` with message:
   "feat(auth): client sends Bearer token, session-based login, cross-tab sync"

## Global Constraints
- TypeScript strict mode ON
- Node 18+
- MIT license
- `npm test -- --run` must pass
- No new runtime dependencies (BroadcastChannel is native)
