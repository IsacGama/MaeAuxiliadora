import { useCallback, useEffect, useMemo, useState } from 'react';
import { publicApi } from '../api';
import { getDayKey, normalizeDayKey, parseDayKey, shiftDayKey } from '../date';
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

const isRenderableImage = (value?: string | null) =>
  Boolean(value && !/\.svg(?:\?|#|$)/i.test(value));

const hasSaintImage = (value: SaintOfDayPayload | null | undefined) =>
  isRenderableImage(value?.imagem_destacada) ||
  isRenderableImage(value?.meta?.['imagem-sm']);

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
  const [selectedDate, setSelectedDate] = useState(() => getDayKey());
  const [state, setState] = useState<SaintState>({
    saint: null,
    isLoading: true,
    isRefreshing: false,
    error: null,
    source: null,
    isToday: false,
  });

  const load = useCallback(async (dayKey: string, forceNetwork = false) => {
    const normalizedDayKey = normalizeDayKey(dayKey);
    const parsedDate = parseDayKey(normalizedDayKey) ?? new Date();
    const isToday = normalizedDayKey === getDayKey();

    if (forceNetwork) {
      setState((prev) => ({ ...prev, isRefreshing: true, error: null }));
    } else {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
    }

    let hasAnyCache = false;

    if (!forceNetwork) {
      const daily = await getDailyCacheValue<unknown>(SAINT_CACHE_KEY, normalizedDayKey);
      if (isValidSaintPayload(daily)) {
        hasAnyCache = true;
        setState({
          saint: daily,
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: 'cache',
          isToday,
        });
        if (hasSaintImage(daily)) {
          return;
        }
      }
      if (daily !== null) {
        await clearCache(SAINT_CACHE_KEY);
      }

      const stale = await getCacheEnvelope<unknown>(SAINT_CACHE_KEY);
      if (isValidSaintPayload(stale?.value) && stale.dayKey === normalizedDayKey) {
        hasAnyCache = true;
        setState({
          saint: stale.value,
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: 'cache',
          isToday,
        });
        if (hasSaintImage(stale.value)) {
          return;
        }
      } else if (stale?.value !== undefined) {
        await clearCache(SAINT_CACHE_KEY);
      }
    }

    try {
      const saint = await publicApi.fetchSaintOfDay(parsedDate.getDate(), parsedDate.getMonth() + 1);
      await setCache(SAINT_CACHE_KEY, saint, { dayKey: normalizedDayKey });
      setState({
        saint,
        isLoading: false,
        isRefreshing: false,
        error: null,
        source: 'network',
        isToday,
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
    void load(selectedDate);
  }, [load, selectedDate]);

  const goToPreviousDate = useCallback(() => {
    setSelectedDate((prev) => shiftDayKey(prev, -1));
  }, []);

  const goToNextDate = useCallback(() => {
    setSelectedDate((prev) => shiftDayKey(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(getDayKey());
  }, []);

  const setDate = useCallback((dayKey: string) => {
    setSelectedDate(normalizeDayKey(dayKey));
  }, []);

  return useMemo(
    () => ({
      ...state,
      selectedDate,
      refresh: () => load(selectedDate, true),
      goToPreviousDate,
      goToNextDate,
      goToToday,
      setDate,
    }),
    [goToNextDate, goToPreviousDate, goToToday, load, selectedDate, setDate, state],
  );
};
