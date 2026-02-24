import { useCallback, useEffect, useMemo, useState } from 'react';
import { publicApi } from '../api';
import { getDayKey } from '../date';
import { HttpError } from '../http';
import { getCacheEnvelope, getDailyCacheValue, setCache } from '../storage';
import { LiturgyPayload } from '../types';

type LiturgyState = {
  liturgy: LiturgyPayload | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  source: 'network' | 'cache' | null;
  isToday: boolean;
};

const LITURGY_CACHE_KEY = 'spd-mobile:liturgy:daily';

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

export const useDailyLiturgy = () => {
  const [state, setState] = useState<LiturgyState>({
    liturgy: null,
    isLoading: true,
    isRefreshing: false,
    error: null,
    source: null,
    isToday: false,
  });

  const load = useCallback(async (forceNetwork = false) => {
    const dayKey = getDayKey();

    if (forceNetwork) {
      setState((prev) => ({ ...prev, isRefreshing: true, error: null }));
    } else {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
    }

    let hasAnyCache = false;

    if (!forceNetwork) {
      const daily = await getDailyCacheValue<LiturgyPayload>(LITURGY_CACHE_KEY, dayKey);
      if (daily) {
        hasAnyCache = true;
        setState({
          liturgy: daily,
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: 'cache',
          isToday: true,
        });
        return;
      }

      const stale = await getCacheEnvelope<LiturgyPayload>(LITURGY_CACHE_KEY);
      if (stale?.value) {
        hasAnyCache = true;
        setState({
          liturgy: stale.value,
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: 'cache',
          isToday: stale.dayKey === dayKey,
        });
      }
    }

    try {
      const liturgy = await publicApi.fetchDailyLiturgy(dayKey);
      await setCache(LITURGY_CACHE_KEY, liturgy, { dayKey });
      setState({
        liturgy,
        isLoading: false,
        isRefreshing: false,
        error: null,
        source: 'network',
        isToday: true,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: hasAnyCache ? null : getMessage(error, 'Não foi possível carregar a liturgia diária.'),
      }));
    }
  }, []);

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
