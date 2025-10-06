import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AuthRestrictions = {
  masterPolicies?: {
    maxChildUsers: number;
    childDeviceLimit: number;
    childAllowedViews: string[];
    childCanExportReports: boolean;
    childCanManageDrivers: boolean;
  };
  allowedViews?: string[];
  deviceLimit?: number;
  canExportReports?: boolean;
  canManageDrivers?: boolean;
  canAcknowledgeAlerts?: boolean;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'master' | 'child';
  restrictions?: AuthRestrictions;
  parentId?: string;
  createdAt?: string;
  createdBy?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isBootstrapping: boolean;
  isSubmitting: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  apiFetch: <T = any>(path: string, options?: RequestInit & { skipAuth?: boolean }) => Promise<T>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'linka:auth';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken }));
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const apiFetch = useCallback(
    async <T,>(path: string, options: RequestInit & { skipAuth?: boolean } = {}) => {
      const { skipAuth, headers, body, ...rest } = options;
      const requestHeaders = new Headers(headers || {});

      if (!skipAuth) {
        if (!token) {
          clearSession();
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        requestHeaders.set('Authorization', `Bearer ${token}`);
      }

      if (body && !(body instanceof FormData) && !requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json');
      }

      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: requestHeaders,
        body,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearSession();
        }
        const payload = await parseJsonSafe(response);
        const message = payload?.error || response.statusText || 'Erro ao comunicar com o servidor';
        throw new Error(message);
      }

      const payload = await parseJsonSafe(response);
      return payload as T;
    },
    [clearSession, token]
  );

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const data = await apiFetch<{ user: AuthUser }>(`/auth/me`);
      setUser(data.user);
    } catch (err) {
      console.error('Falha ao validar sessão:', err);
      clearSession();
    }
  }, [apiFetch, clearSession, token]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setIsBootstrapping(false);
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.token) {
        setToken(parsed.token);
        apiFetch('/auth/me', { skipAuth: true, headers: { Authorization: `Bearer ${parsed.token}` } })
          .then((data: any) => {
            setUser(data.user);
            setToken(parsed.token);
          })
          .catch(() => {
            clearSession();
          })
          .finally(() => setIsBootstrapping(false));
        return;
      }
    } catch (err) {
      console.warn('Sessão inválida no armazenamento local', err);
    }
    clearSession();
    setIsBootstrapping(false);
  }, [apiFetch, clearSession]);

  useEffect(() => {
    if (!isBootstrapping && token && !user) {
      refreshProfile();
    }
  }, [isBootstrapping, token, user, refreshProfile]);

  const login = useCallback(async (email: string, password: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await parseJsonSafe(response);
      if (!response.ok || !payload?.token || !payload?.user) {
        const message = payload?.error || 'Não foi possível autenticar';
        throw new Error(message);
      }
      persistSession(payload.token, payload.user);
    } catch (err: any) {
      const message = err?.message || 'Erro ao autenticar';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [persistSession]);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await apiFetch('/auth/logout', { method: 'POST' });
      } catch (err) {
        console.warn('Erro ao finalizar sessão', err);
      }
    }
    clearSession();
  }, [apiFetch, clearSession, token]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isBootstrapping,
    isSubmitting,
    error,
    login,
    logout,
    apiFetch,
    refreshProfile,
  }), [apiFetch, error, isBootstrapping, isSubmitting, login, logout, refreshProfile, token, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return ctx;
}
