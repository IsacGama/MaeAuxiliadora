import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';
import { getDayKey } from '../date';
import { HttpError } from '../http';
import { getCacheEnvelope, getDailyCacheValue, setCache } from '../storage';
import { MemberDashboard } from '../types';
import { useAuth } from '../auth-context';

type DashboardState = {
  dashboard: MemberDashboard | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  source: 'network' | 'cache' | null;
};

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

const cacheKeyForUser = (userId: string) => `spd-mobile:member-dashboard:${userId}`;

export const useMemberDashboard = () => {
  const { isAuthenticated, session, requestWithAuth } = useAuth();
  const [state, setState] = useState<DashboardState>({
    dashboard: null,
    isLoading: false,
    isRefreshing: false,
    error: null,
    source: null,
  });

  const load = useCallback(
    async (forceNetwork = false) => {
      if (!isAuthenticated || !session?.user?.id) {
        setState({
          dashboard: null,
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
        const daily = await getDailyCacheValue<MemberDashboard>(cacheKey, dayKey);
        if (daily) {
          hasAnyCache = true;
          setState({
            dashboard: daily,
            isLoading: false,
            isRefreshing: false,
            error: null,
            source: 'cache',
          });
          return;
        }

        const stale = await getCacheEnvelope<MemberDashboard>(cacheKey);
        if (stale?.value) {
          hasAnyCache = true;
          setState({
            dashboard: stale.value,
            isLoading: false,
            isRefreshing: false,
            error: null,
            source: 'cache',
          });
        }
      }

      try {
        const dashboard = await requestWithAuth((token) => authApi.dashboard(token));
        await setCache(cacheKey, dashboard, { dayKey });

        setState({
          dashboard,
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
          error: hasAnyCache ? null : getMessage(error, 'Não foi possível carregar o painel do fiel.'),
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
