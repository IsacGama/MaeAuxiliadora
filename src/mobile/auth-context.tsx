import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from './api';
import { HttpError } from './http';
import { clearCache, getCacheValue, setCache } from './storage';
import { AuthResponse, AuthUser } from './types';

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type AuthContextValue = {
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    parishId: string;
    chapelId?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  requestWithAuth: <T>(request: (accessToken: string) => Promise<T>) => Promise<T>;
};

const SESSION_CACHE_KEY = 'spd-mobile:auth-session';
const SESSION_TTL_MS = 3650 * 24 * 60 * 60 * 1000; // 10 anos

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const toSession = (payload: AuthResponse): AuthSession => ({
  accessToken: payload.accessToken,
  refreshToken: payload.refreshToken,
  user: payload.user,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistSession = useCallback(async (nextSession: AuthSession | null) => {
    if (!nextSession) {
      await clearCache(SESSION_CACHE_KEY);
      return;
    }

    await setCache(SESSION_CACHE_KEY, nextSession, { ttlMs: SESSION_TTL_MS });
  }, []);

  useEffect(() => {
    const load = async () => {
      const stored = await getCacheValue<AuthSession>(SESSION_CACHE_KEY);
      setSession(stored);
      setIsLoading(false);
    };

    void load();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const nextSession = toSession(response);
    setSession(nextSession);
    await persistSession(nextSession);
  }, [persistSession]);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      parishId: string;
      chapelId?: string;
    }) => {
      const response = await authApi.register(payload);
      const nextSession = toSession(response);
      setSession(nextSession);
      await persistSession(nextSession);
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    setSession(null);
    await persistSession(null);
  }, [persistSession]);

  const refreshSession = useCallback(async () => {
    if (!session?.refreshToken) {
      throw new HttpError(401, 'Sessão expirada', null);
    }

    const refreshed = await authApi.refresh(session.refreshToken);
    const nextSession = toSession(refreshed);
    setSession(nextSession);
    await persistSession(nextSession);
    return nextSession;
  }, [persistSession, session?.refreshToken]);

  const requestWithAuth = useCallback(
    async <T,>(request: (accessToken: string) => Promise<T>): Promise<T> => {
      if (!session) {
        throw new HttpError(401, 'Faça login para continuar', null);
      }

      try {
        return await request(session.accessToken);
      } catch (error) {
        if (!(error instanceof HttpError) || error.status !== 401) {
          throw error;
        }

        const nextSession = await refreshSession();
        return request(nextSession.accessToken);
      }
    },
    [refreshSession, session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isAuthenticated: Boolean(session),
      login,
      register,
      logout,
      requestWithAuth,
    }),
    [isLoading, login, logout, register, requestWithAuth, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  }
  return context;
};
