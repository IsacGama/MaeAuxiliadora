import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { authApi } from './api';
import { HttpError } from './http';
import {
  clearRegisteredPushToken,
  getRegisteredPushToken,
  queuePushTokenForUnregister,
  unregisterPushNotifications,
} from './notifications';
import {
  AUTH_SESSION_TTL_MS,
  loadAuthSession,
  saveAuthSession,
} from './auth-session-storage';
import { notifyAppAlert } from './app-alert';
import { clearStorageByPrefix } from './storage';
import { AuthQueuedActionResponse, AuthResponse, AuthUser } from './types';
import { FONT_SCALE_PREFERENCE_STORAGE_KEY } from './font-scale-preference';

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
    orgId: string;
    primaryPhone: string;
    cpf: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNDECLARED';
    consentLgpd?: boolean;
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
  }) => Promise<AuthQueuedActionResponse>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  requestWithAuth: <T>(request: (accessToken: string) => Promise<T>) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const toSession = (payload: AuthResponse): AuthSession => ({
  accessToken: payload.accessToken,
  refreshToken: payload.refreshToken,
  user: payload.user,
});

const APP_STORAGE_PREFIX = 'spd-mobile:';
const THEME_PREFERENCE_STORAGE_KEY = 'spd-mobile:theme-preference';
const SESSION_INVALIDATION_ALERT_COOLDOWN_MS = 5000;

const isConnectivityError = (error: unknown): error is HttpError =>
  error instanceof HttpError && (error.status === 0 || error.status === 408);

const isInvalidSessionError = (error: unknown): error is HttpError =>
  error instanceof HttpError &&
  (error.status === 401 || error.status === 403 || error.status === 404);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const invalidationInFlightRef = useRef(false);
  const lastSessionAlertAtRef = useRef(0);

  const persistSession = useCallback(async (nextSession: AuthSession | null) => {
    await saveAuthSession(nextSession, AUTH_SESSION_TTL_MS);
  }, []);

  const clearLocalAuthState = useCallback(
    async (options?: { queuePushToken?: boolean }) => {
      const shouldQueuePushToken = options?.queuePushToken ?? true;
      const registeredPushToken = await getRegisteredPushToken();

      if (registeredPushToken && shouldQueuePushToken) {
        await queuePushTokenForUnregister(registeredPushToken);
      }

      await clearRegisteredPushToken();
      setSession(null);
      await persistSession(null);
      await clearStorageByPrefix(APP_STORAGE_PREFIX, {
        preserveKeys: [THEME_PREFERENCE_STORAGE_KEY, FONT_SCALE_PREFERENCE_STORAGE_KEY],
      });
    },
    [persistSession],
  );

  const invalidateSession = useCallback(
    async (message: string) => {
      if (invalidationInFlightRef.current) {
        return;
      }

      invalidationInFlightRef.current = true;
      try {
        await clearLocalAuthState({ queuePushToken: true });
        const now = Date.now();
        if (
          now - lastSessionAlertAtRef.current >
          SESSION_INVALIDATION_ALERT_COOLDOWN_MS
        ) {
          lastSessionAlertAtRef.current = now;
          void notifyAppAlert('Sessão encerrada', message, 'danger');
        }
      } finally {
        invalidationInFlightRef.current = false;
      }
    },
    [clearLocalAuthState],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const stored = await loadAuthSession<AuthSession>(AUTH_SESSION_TTL_MS);
      if (cancelled) {
        return;
      }

      setSession(stored);
      setIsLoading(false);

      if (!stored?.refreshToken) {
        return;
      }

      try {
        const refreshed = await authApi.refresh(stored.refreshToken);
        if (cancelled) {
          return;
        }

        const nextSession = toSession(refreshed);
        setSession(nextSession);
        await persistSession(nextSession);
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isConnectivityError(error)) {
          console.warn(
            `[auth] sessão não validada no startup por conectividade: ${error.message}`,
          );
          return;
        }

        if (isInvalidSessionError(error)) {
          await invalidateSession(
            'Sua sessão não é mais válida. Faça login novamente para continuar.',
          );
          return;
        }

        const message =
          error instanceof Error ? error.message : 'erro desconhecido';
        console.warn(
          `[auth] falha ao validar sessão no startup: ${message}`,
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [invalidateSession, persistSession]);

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
      orgId: string;
      primaryPhone: string;
      cpf: string;
      gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNDECLARED';
      consentLgpd?: boolean;
      address?: {
        street: string;
        number: string;
        complement?: string;
        neighborhood: string;
        city: string;
        state: string;
        zipCode: string;
      };
    }) => {
      return authApi.register(payload);
    },
    [],
  );

  const logout = useCallback(async () => {
    const currentAccessToken = session?.accessToken;

    try {
      if (currentAccessToken) {
        try {
          await authApi.logout(currentAccessToken);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'erro desconhecido';
          console.warn(`[auth] falha ao invalidar sessão no backend: ${message}`);
        }
      }

      const registeredPushToken = await getRegisteredPushToken();

      if (registeredPushToken) {
        if (currentAccessToken) {
          try {
            await unregisterPushNotifications(
              currentAccessToken,
              registeredPushToken,
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'erro desconhecido';
            console.warn(
              `[push] falha ao desregistrar dispositivo no logout: ${message}`,
            );
            await queuePushTokenForUnregister(registeredPushToken);
          }
        } else {
          await queuePushTokenForUnregister(registeredPushToken);
        }
      }
    } finally {
      await clearLocalAuthState({ queuePushToken: false });
    }
  }, [clearLocalAuthState, session?.accessToken]);

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

        let nextSession: AuthSession;
        try {
          nextSession = await refreshSession();
        } catch (refreshError) {
          if (isConnectivityError(refreshError)) {
            throw new HttpError(
              refreshError.status,
              'Não foi possível renovar sua sessão por falta de conexão. Tente novamente.',
              refreshError.payload,
            );
          }

          if (isInvalidSessionError(refreshError)) {
            await invalidateSession(
              'Sua sessão expirou ou foi invalidada. Entre novamente.',
            );
            throw new HttpError(
              401,
              'Sessão expirada. Faça login novamente.',
              null,
            );
          }

          throw refreshError;
        }

        try {
          return await request(nextSession.accessToken);
        } catch (retryError) {
          if (!(retryError instanceof HttpError) || retryError.status !== 401) {
            throw retryError;
          }

          if (retryError.status === 401) {
            await invalidateSession(
              'Sua sessão expirou ou foi invalidada. Entre novamente.',
            );
          }

          throw new HttpError(
            401,
            'Sessão expirada. Faça login novamente.',
            null,
          );
        }
      }
    },
    [invalidateSession, refreshSession, session],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const updatedUser = await requestWithAuth((accessToken) =>
        authApi.changePassword(accessToken, { currentPassword, newPassword }),
      );
      setSession((current) => {
        if (!current) return current;
        const nextSession = {
          ...current,
          user: updatedUser.user,
        };
        void persistSession(nextSession);
        return nextSession;
      });
    },
    [persistSession, requestWithAuth],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isAuthenticated: Boolean(session),
      login,
      register,
      changePassword,
      logout,
      requestWithAuth,
    }),
    [changePassword, isLoading, login, logout, register, requestWithAuth, session],
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
