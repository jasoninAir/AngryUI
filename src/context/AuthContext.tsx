// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getStoredToken, setStoredToken, clearStoredToken, broadcastTokenChange } from '@/lib/auth';
import { fetchAuthStatus, loginWithToken } from '@/lib/api';

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  authRequired: boolean;
  isChecking: boolean;
  login: (t: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  token: null,
  isAuthenticated: false,
  authRequired: true,
  isChecking: true,
  login: async () => ({ success: false }),
  logout: () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [authRequired, setAuthRequired] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(getStoredToken());
  });
  const [isChecking, setIsChecking] = useState(true);

  // Verify auth status on mount
  const checkStatus = useCallback(async () => {
    try {
      const status = await fetchAuthStatus();
      setAuthRequired(status.authRequired);
      if (!status.authRequired) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(status.authenticated);
        if (!status.authenticated) {
          clearStoredToken();
          setToken(null);
        }
      }
    } catch {
      // Fallback: if server check fails, rely on local token existence
      const localToken = getStoredToken();
      setIsAuthenticated(Boolean(localToken));
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Sync across browser tabs via BroadcastChannel
  useEffect(() => {
    const ch = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('angryui_auth') : null;
    const h = (e: MessageEvent) => {
      if (e.data?.type === 'token_change') {
        const nextToken = e.data.token;
        setToken(nextToken);
        if (nextToken) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(!authRequired);
        }
      }
    };
    ch?.addEventListener('message', h);
    return () => ch?.removeEventListener('message', h);
  }, [authRequired]);

  const login = async (t: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await loginWithToken(t);
      if (result.ok && result.authenticated) {
        const validToken = result.token || t;
        setStoredToken(validToken);
        broadcastTokenChange(validToken);
        setToken(validToken);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: result.error || 'Invalid access token' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const logout = () => {
    clearStoredToken();
    broadcastTokenChange(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        authRequired,
        isChecking,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
