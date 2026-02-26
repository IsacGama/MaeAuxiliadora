import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';
import { useAuth } from '../auth-context';
import { getDayKey } from '../date';
import { HttpError } from '../http';
import { getCacheEnvelope, getDailyCacheValue, setCache } from '../storage';
import { MemberNotificationItem } from '../types';

type MemberNotificationsState = {
  notifications: MemberNotificationItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  source: 'network' | 'cache' | null;
};

const cacheKeyForUser = (userId: string) =>
  `spd-mobile:member-notifications:${userId}`;

const getMessage = (error: unknown, fallback: string) => {
  if (error instanceof HttpError) {
    if (error.status === 0 || error.status === 408) {
      return 'Sem conexão no momento. Tentaremos novamente.';
    }
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};

export const useMemberNotifications = () => {
  const { isAuthenticated, session, requestWithAuth } = useAuth();
  const [state, setState] = useState<MemberNotificationsState>({
    notifications: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    source: null,
  });

  const load = useCallback(
    async (forceNetwork = false) => {
      if (!isAuthenticated || !session?.user?.id) {
        setState({
          notifications: [],
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: null,
        });
        return;
      }

      const cacheKey = cacheKeyForUser(session.user.id);
      const dayKey = getDayKey();

      if (forceNetwork) {
        setState((prev) => ({ ...prev, isRefreshing: true, error: null }));
      } else {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      let hasAnyCache = false;

      if (!forceNetwork) {
        const daily = await getDailyCacheValue<MemberNotificationItem[]>(
          cacheKey,
          dayKey,
        );
        if (daily) {
          hasAnyCache = true;
          setState({
            notifications: daily,
            isLoading: false,
            isRefreshing: false,
            error: null,
            source: 'cache',
          });
          return;
        }

        const stale = await getCacheEnvelope<MemberNotificationItem[]>(cacheKey);
        if (stale?.value) {
          hasAnyCache = true;
          setState({
            notifications: stale.value,
            isLoading: false,
            isRefreshing: false,
            error: null,
            source: 'cache',
          });
        }
      }

      try {
        const notifications = await requestWithAuth((token) =>
          authApi.memberNotifications(token),
        );
        await setCache(cacheKey, notifications, { dayKey });

        setState({
          notifications,
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: 'network',
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          error: hasAnyCache
            ? null
            : getMessage(error, 'Não foi possível carregar suas mensagens.'),
        }));
      }
    },
    [isAuthenticated, requestWithAuth, session?.user?.id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({
      ...state,
      refresh: () => load(true),
    }),
    [load, state],
  );
};
