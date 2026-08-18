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
