import { useCallback, useEffect, useMemo, useState } from 'react';
import { publicApi } from '../api';
import { getDayKey } from '../date';
import { HttpError } from '../http';
import { clearCache, getCacheEnvelope, getDailyCacheValue, setCache } from '../storage';
import { SaintOfDayPayload } from '../types';

type SaintState = {
  saint: SaintOfDayPayload | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  source: 'network' | 'cache' | null;
  isToday: boolean;
};

const SAINT_CACHE_KEY = 'spd-mobile:saint-of-day';

const isValidSaintPayload = (value: unknown): value is SaintOfDayPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const payload = value as SaintOfDayPayload;
  const title = payload?.title?.rendered;
  const content = payload?.content?.rendered;
  const excerpt = payload?.excerpt?.rendered;
  return (
    typeof title === 'string' ||
    typeof content === 'string' ||
    typeof excerpt === 'string'
  );
};

const getMessage = (error: unknown, fallback: string) => {
  if (error instanceof HttpError) {
    if (error.status === 0 || error.status === 408) {
      return 'Sem conexão no momento. Tentaremos novamente.';
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
};

export const useSaintOfDay = () => {
  const [state, setState] = useState<SaintState>({
    saint: null,
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
      const daily = await getDailyCacheValue<unknown>(SAINT_CACHE_KEY, dayKey);
      if (isValidSaintPayload(daily)) {
        hasAnyCache = true;
        setState({
          saint: daily,
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: 'cache',
          isToday: true,
        });
        return;
      }
      if (daily !== null) {
        await clearCache(SAINT_CACHE_KEY);
      }

      const stale = await getCacheEnvelope<unknown>(SAINT_CACHE_KEY);
      if (isValidSaintPayload(stale?.value)) {
        hasAnyCache = true;
        setState({
          saint: stale.value,
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: 'cache',
          isToday: stale.dayKey === dayKey,
        });
      } else if (stale?.value !== undefined) {
        await clearCache(SAINT_CACHE_KEY);
      }
    }

    try {
      const now = new Date();
      const saint = await publicApi.fetchSaintOfDay(now.getDate(), now.getMonth() + 1);
      await setCache(SAINT_CACHE_KEY, saint, { dayKey });
      setState({
        saint,
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
        error: hasAnyCache ? null : getMessage(error, 'Não foi possível carregar o santo do dia.'),
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
